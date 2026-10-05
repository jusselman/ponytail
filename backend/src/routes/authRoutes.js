const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { register, login, getMe } = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ── Cover/audio URL resolution — shared with playlistController.js, see
// utils/trackUrls.js for the fuzzy-filesystem-match + upload-branching logic. ──
const { getCoverUrl, getAudioUrl, buildTrackUrls } = require('../utils/trackUrls');
const geo = require('../services/geo');

// ── Ensure uploads directory exists ──
const uploadDir = path.join(__dirname, '../../assets/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ── Multer config ──
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${req.user.id}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Invalid file type'));
  },
});

// Upload profile picture
router.post('/upload-avatar', requireAuth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const avatarUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    await pool.query(
      'UPDATE users SET profile_picture = $1 WHERE id = $2',
      [avatarUrl, req.user.id]
    );
    res.json({ avatarUrl });
  } catch (err) {
    console.error('Avatar upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// ── Multer config for musician track uploads — audio required, cover optional.
// Separate from the avatar `upload` instance above since it needs two named fields
// and a much larger size limit for audio files. ──
const trackStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const prefix = file.fieldname === 'audio' ? 'track-audio' : 'track-cover';
    cb(null, `${prefix}-${req.user.id}-${Date.now()}${ext}`);
  },
});

const trackUpload = multer({
  storage: trackStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max — comfortably covers a full track at high bitrate
  fileFilter: (req, file, cb) => {
    const allowedAudio = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/aac', 'audio/ogg'];
    const allowedImage = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (file.fieldname === 'audio') {
      allowedAudio.includes(file.mimetype) ? cb(null, true) : cb(new Error('Invalid audio file type'));
    } else if (file.fieldname === 'cover') {
      allowedImage.includes(file.mimetype) ? cb(null, true) : cb(new Error('Invalid cover image type'));
    } else {
      cb(new Error('Unexpected field'));
    }
  },
});

// Musician track upload — only accounts with is_artist=true can publish tracks.
// Inserted straight into seed_tracks so uploads flow through every existing
// search/discovery/playback path exactly like Andrew's imported catalog, just
// flagged is_user_upload so URL resolution skips the fuzzy filesystem match
// (see getCoverUrl/getAudioUrl above) in favor of these tracks' own stored URLs.
router.post(
  '/tracks/upload',
  requireAuth,
  trackUpload.fields([{ name: 'audio', maxCount: 1 }, { name: 'cover', maxCount: 1 }]),
  async (req, res) => {
    try {
      const artistCheck = await pool.query(
        `SELECT is_artist, display_name, username, location, genre, subgenre, mood, sound_description,
                location_lat, location_lng, location_country, location_region
         FROM users WHERE id = $1`,
        [req.user.id]
      );
      const account = artistCheck.rows[0];
      if (!account?.is_artist) {
        return res.status(403).json({ error: 'Only artist accounts can upload tracks.' });
      }

      const audioFile = req.files?.audio?.[0];
      if (!audioFile) return res.status(400).json({ error: 'An audio file is required.' });

      const { title, album } = req.body;
      if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required.' });

      const artistName = account.display_name || account.username;
      const uploadedAudioUrl = `http://localhost:5000/uploads/${audioFile.filename}`;
      const coverFile = req.files?.cover?.[0];
      const uploadedCoverUrl = coverFile ? `http://localhost:5000/uploads/${coverFile.filename}` : null;

      // ── Genre/subgenre/mood/tag5/location all come from the musician's own
      // profile (captured once during onboarding) rather than being re-asked per
      // upload — every track this musician publishes gets the same tags, matching
      // the enriched_db.csv vocabulary just like Andrew's imported catalog rows,
      // and feeding the personalized radio station / Hot in Here matching. ──
      const result = await pool.query(
        `INSERT INTO seed_tracks
           (title, artist, album, genre, subgenre, mood, tag5, location,
            uploader_user_id, is_user_upload, uploaded_audio_url, uploaded_cover_url,
            location_lat, location_lng, location_country, location_region)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (title, artist) DO UPDATE SET
           album = EXCLUDED.album,
           genre = EXCLUDED.genre,
           subgenre = EXCLUDED.subgenre,
           mood = EXCLUDED.mood,
           tag5 = EXCLUDED.tag5,
           location = EXCLUDED.location,
           location_lat = EXCLUDED.location_lat,
           location_lng = EXCLUDED.location_lng,
           location_country = EXCLUDED.location_country,
           location_region = EXCLUDED.location_region,
           uploaded_audio_url = EXCLUDED.uploaded_audio_url,
           uploaded_cover_url = EXCLUDED.uploaded_cover_url
         RETURNING id, title, artist, album, genre, subgenre, mood, tag5, location`,
        [
          title.trim(), artistName, album || null,
          account.genre || null, account.subgenre || null, account.mood || null,
          account.sound_description || null, account.location || null,
          req.user.id, uploadedAudioUrl, uploadedCoverUrl,
          account.location_lat ?? null, account.location_lng ?? null,
          account.location_country || null, account.location_region || null,
        ]
      );

      const track = result.rows[0];
      res.status(201).json({
        track: {
          ...track,
          coverUrl: uploadedCoverUrl,
          audioUrl: uploadedAudioUrl,
        },
      });
    } catch (err) {
      console.error('Track upload error:', err);
      res.status(500).json({ error: 'Upload failed.' });
    }
  }
);

// A musician's own uploaded tracks — powers a "Your Uploads" row in My Music.
router.get('/tracks/mine', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, artist, album, genre, is_user_upload, uploaded_audio_url, uploaded_cover_url, created_at
       FROM seed_tracks
       WHERE uploader_user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    const tracks = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      artist: row.artist,
      album: row.album,
      genre: row.genre,
      coverUrl: getCoverUrl(row),
      audioUrl: getAudioUrl(row),
    }));
    res.json({ tracks });
  } catch (err) {
    console.error('Get my uploads error:', err);
    res.status(500).json({ error: 'Failed to fetch your uploads.' });
  }
});

// ── Best-effort removal of a locally-stored upload file from assets/uploads,
// given its public URL. Never throws — a missing/already-deleted file shouldn't
// block the DB delete from succeeding. ──
const deleteUploadedFile = (publicUrl) => {
  if (!publicUrl) return;
  try {
    const filename = publicUrl.split('/uploads/')[1];
    if (!filename) return;
    const filePath = path.join(uploadDir, decodeURIComponent(filename));
    fs.unlink(filePath, (err) => {
      if (err && err.code !== 'ENOENT') console.error('Failed to delete upload file:', filePath, err.message);
    });
  } catch (err) {
    console.error('Failed to resolve upload file path for deletion:', err.message);
  }
};

// Delete one of the current musician's own uploaded tracks. Ownership is checked
// via uploader_user_id so a musician can't delete another account's upload, and
// is_user_upload=true so this can never touch Andrew's imported catalog rows.
router.delete('/tracks/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM seed_tracks
       WHERE id = $1 AND uploader_user_id = $2 AND is_user_upload = TRUE
       RETURNING uploaded_audio_url, uploaded_cover_url`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Upload not found.' });
    }

    const { uploaded_audio_url, uploaded_cover_url } = result.rows[0];
    deleteUploadedFile(uploaded_audio_url);
    deleteUploadedFile(uploaded_cover_url);

    res.json({ success: true });
  } catch (err) {
    console.error('Delete upload error:', err);
    res.status(500).json({ error: 'Failed to delete upload.' });
  }
});

// Update one of the current musician's own uploaded tracks — title/album/genre
// and optionally a replacement cover image. Audio itself isn't replaceable here;
// re-uploading a fresh version is the path for that. Reuses the `upload` multer
// instance from the avatar endpoint above (images only, 5MB) with a 'cover' field,
// same pattern playlistRoutes.js uses for playlist covers.
router.put('/tracks/:id', requireAuth, upload.single('cover'), async (req, res) => {
  const { id } = req.params;
  const { title, album, genre } = req.body;

  try {
    if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required.' });

    const ownCheck = await pool.query(
      `SELECT uploaded_cover_url FROM seed_tracks
       WHERE id = $1 AND uploader_user_id = $2 AND is_user_upload = TRUE`,
      [id, req.user.id]
    );
    if (ownCheck.rows.length === 0) return res.status(404).json({ error: 'Upload not found.' });

    let uploadedCoverUrl = ownCheck.rows[0].uploaded_cover_url;
    if (req.file) {
      deleteUploadedFile(uploadedCoverUrl); // replace, not accumulate — remove the old cover file
      uploadedCoverUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    }

    const result = await pool.query(
      `UPDATE seed_tracks
       SET title = $1, album = $2, genre = $3, uploaded_cover_url = $4
       WHERE id = $5 AND uploader_user_id = $6 AND is_user_upload = TRUE
       RETURNING id, title, artist, album, genre, is_user_upload, uploaded_audio_url, uploaded_cover_url`,
      [title.trim(), album || null, genre || null, uploadedCoverUrl, id, req.user.id]
    );

    const track = result.rows[0];
    res.json({
      track: {
        ...track,
        coverUrl: getCoverUrl(track),
        audioUrl: getAudioUrl(track),
      },
    });
  } catch (err) {
    if (err.code === '23505') { // unique_violation on seed_tracks(title, artist)
      return res.status(409).json({ error: 'You already have a track with that title.' });
    }
    console.error('Update upload error:', err);
    res.status(500).json({ error: 'Failed to update track.' });
  }
});

// ── Hot in Here — the station at 0 on the Radio dial: artists within 10 miles
// of the listener. The centre is the listener's own city when they have one
// (users.location_lat/lng, see migration 011) and San Francisco otherwise
// (geo.DEFAULT_HOME), so the station always has somewhere to broadcast from.
//
// The pool is every located track inside the radius: Ponytail musicians'
// uploads first (newest first — they're who the station is for), then catalog
// artists from the area, better-known tracks more likely to surface. No artist
// gets more than a handful of slots, so one big local catalog can't take over,
// and the listener's own uploads are left out. ──
const HOT_IN_HERE_LIMIT = 40;
const HOT_IN_HERE_PER_ARTIST = 4;

router.get('/radio/hot-in-here', requireAuth, async (req, res) => {
  try {
    const home = (await geo.userHome(req.user.id)) || geo.DEFAULT_HOME;
    const usingDefault = home === geo.DEFAULT_HOME;
    const distance = geo.distanceSql('st.location_lat', 'st.location_lng', '$2::float8', '$3::float8');

    const result = await pool.query(
      `SELECT * FROM (
         SELECT st.id, st.title, st.artist, st.album, st.genre, st.location,
                st.is_user_upload, st.uploaded_audio_url, st.uploaded_cover_url, st.cover, st.filename,
                st.created_at, st.popularity,
                u.username, u.display_name,
                ROW_NUMBER() OVER (
                  PARTITION BY lower(st.artist)
                  ORDER BY st.is_user_upload DESC NULLS LAST, RANDOM()
                ) AS artist_rank
         FROM seed_tracks st
         LEFT JOIN users u ON u.id = st.uploader_user_id
         WHERE st.location_lat IS NOT NULL
           AND ${distance} <= $4
           AND (st.uploader_user_id IS NULL OR st.uploader_user_id != $1)
       ) nearby
       WHERE artist_rank <= $5
       ORDER BY is_user_upload DESC NULLS LAST,
                CASE WHEN is_user_upload THEN EXTRACT(EPOCH FROM created_at) END DESC NULLS LAST,
                -- catalog: random, nudged toward more popular tracks
                (COALESCE(popularity, 0) + 20) * RANDOM() DESC
       LIMIT $6`,
      [req.user.id, home.lat, home.lng, geo.HOT_IN_HERE_RADIUS_MI, HOT_IN_HERE_PER_ARTIST, HOT_IN_HERE_LIMIT]
    );

    // ── Un-Goat: artists the listener never wants on this station ──
    const hotSettings = (await getBuiltInSettings(req.user.id))['hot-in-here'];
    const excluded = new Set(hotSettings.ungoat.map(a => a.toLowerCase()));
    const ratings = await getUserRatings(req.user.id);
    const pool40 = result.rows
      .filter(row => !excluded.has((row.artist || '').toLowerCase()))
      .map(row => ({
        id: row.id,
        title: row.title,
        artist: row.artist,
        album: row.album,
        genre: row.genre,
        location: row.location,
        isUpload: !!row.is_user_upload,
        musicianUsername: row.username,
        musicianDisplayName: row.display_name,
        coverUrl: getCoverUrl(row),
        audioUrl: getAudioUrl(row),
      }));
    // Uploads stay ahead of the catalog; ratings reorder within each
    const tracks = [
      ...shapeByRatings(pool40.filter(t => t.isUpload), ratings),
      ...shapeByRatings(pool40.filter(t => !t.isUpload), ratings),
    ];

    res.json({
      location: home.label,
      // true while the listener has no city of their own and we assume San Francisco
      isDefaultLocation: usingDefault,
      radiusMiles: geo.HOT_IN_HERE_RADIUS_MI,
      tracks,
    });
  } catch (err) {
    console.error('Hot in here error:', err);
    res.status(500).json({ error: 'Failed to load Hot in Here.' });
  }
});

// ── A musician's personalized radio station — their own uploaded tracks, plus
// catalog tracks that match their profile's genre, subgenre, mood, or where this
// musician is listed as the similar artist (Tag 3). Customization comes later;
// for now this is the whole pool, unfiltered/unranked beyond the match itself. ──
router.get('/radio/my-station', requireAuth, async (req, res) => {
  try {
    const profileResult = await pool.query(
      `SELECT is_artist, display_name, username, genre, subgenre, mood
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    const profile = profileResult.rows[0];
    if (!profile?.is_artist) {
      return res.status(403).json({ error: 'Only artist accounts have a personalized station.' });
    }

    const artistName = profile.display_name || profile.username;

    const mapRow = (row) => ({
      id: row.id,
      title: row.title,
      artist: row.artist,
      album: row.album,
      genre: row.genre,
      subgenre: row.subgenre,
      mood: row.mood,
      coverUrl: getCoverUrl(row),
      audioUrl: getAudioUrl(row),
    });

    const ownTracksResult = await pool.query(
      `SELECT id, title, artist, album, genre, subgenre, mood,
              is_user_upload, uploaded_audio_url, uploaded_cover_url, cover, filename
       FROM seed_tracks
       WHERE uploader_user_id = $1 AND is_user_upload = TRUE
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    const matchedResult = await pool.query(
      `SELECT id, title, artist, album, genre, subgenre, mood,
              is_user_upload, uploaded_audio_url, uploaded_cover_url, cover, filename
       FROM seed_tracks
       WHERE artist != $1
         AND (
           ($2::text IS NOT NULL AND genre = $2)
           OR ($3::text IS NOT NULL AND subgenre = $3)
           OR ($4::text IS NOT NULL AND mood = $4)
           OR similar_artist = $1
         )
       ORDER BY random()
       LIMIT 40`,
      [artistName, profile.genre, profile.subgenre, profile.mood]
    );

    const myRatings = await getUserRatings(req.user.id);
    // The Station Panel fields add to the profile matches: Artist and Tags
    // widen the pool, the Goat comes round often, Un-Goats never play.
    const mySettings = (await getBuiltInSettings(req.user.id))['your-station'];
    const muted = new Set(mySettings.ungoat.map(a => a.toLowerCase()));
    const notMuted = (t) => !muted.has((t.artist || '').toLowerCase());
    const fromFields = await goatModePool(mySettings, myRatings);
    const seen = new Set();
    const matched = [...fromFields.others, ...shapeByRatings(matchedResult.rows.map(mapRow), myRatings)]
      .filter(notMuted)
      .filter(t => t.artist !== artistName && (mySettings.goat || '').toLowerCase() !== (t.artist || '').toLowerCase())
      .filter(t => (seen.has(t.id) ? false : (seen.add(t.id), true)));
    res.json({
      artistName,
      genre: profile.genre,
      subgenre: profile.subgenre,
      mood: profile.mood,
      ownTracks: shapeByRatings(ownTracksResult.rows.map(mapRow), myRatings),
      matchedTracks: mixInGoat(matched, fromFields.goatTracks),
      settings: mySettings,
    });
  } catch (err) {
    console.error('My station error:', err);
    res.status(500).json({ error: 'Failed to build your station.' });
  }
});

// ─── Frequency-dial Radio tab ─ custom stations + GOAT/UN-GOAT ──────────────────────

// ─── Goat Mode ─ how the four Station Panel fields turn into a queue ──────────
//   Artist   plays music that sounds like them: artists tagged as similar to
//            them, the artists they are tagged as similar to, and their
//            subgenre. Their own tracks are in the mix but get no special place.
//   Tags     each tag a track carries (genre, subgenre, mood, tag5) adds to it.
//   Goat     nudges the mix the way Artist does, at a lighter weight, and the
//            Goat's own tracks are dealt in at a fixed rhythm: about 1 in 3.
//   Un-Goat  those artists never play.
const MAX_STATION_TAGS = 8;
const MAX_STATION_UNGOATS = 25;
const STATION_QUEUE_OTHERS = 30;
const GOAT_EVERY = 3;

const cleanText = (v) => (typeof v === 'string' ? v.trim().slice(0, 255) : '');
const cleanList = (v, max) => {
  const seen = new Set();
  const out = [];
  (Array.isArray(v) ? v : []).forEach((item) => {
    const text = cleanText(item);
    if (!text || seen.has(text.toLowerCase())) return;
    seen.add(text.toLowerCase());
    out.push(text);
  });
  return out.slice(0, max);
};
// Whatever arrives (a request body, a JSON column) → the four fields, tidy
const cleanStationSettings = (raw) => ({
  artist: cleanText(raw?.artist) || null,
  tags: cleanList(raw?.tags, MAX_STATION_TAGS),
  goat: cleanText(raw?.goat) || null,
  ungoat: cleanList(raw?.ungoat, MAX_STATION_UNGOATS),
});
// Does the station have anything to play from? (Un-Goat alone only removes.)
const settingsHaveSound = (st) => !!(st.artist || st.goat || st.tags.length);
const stationRowSettings = (row) => cleanStationSettings({
  artist: row.seed_artist, tags: row.tags, goat: row.goat_artist, ungoat: row.ungoat_artists,
});

// The built-in stations' fields, saved on the user. Hot in Here only takes Un-Goat.
async function getBuiltInSettings(userId) {
  const result = await pool.query(`SELECT radio_station_settings FROM users WHERE id = $1`, [userId]);
  const saved = result.rows[0]?.radio_station_settings || {};
  return {
    'hot-in-here': { artist: null, tags: [], goat: null, ungoat: cleanStationSettings(saved['hot-in-here']).ungoat },
    'your-station': cleanStationSettings(saved['your-station']),
  };
}

const STATION_TRACK_COLUMNS = `id, title, artist, album, genre, subgenre, mood,
  is_user_upload, uploaded_audio_url, uploaded_cover_url, cover, filename`;
const mapStationRow = (row) => ({
  id: row.id,
  title: row.title,
  artist: row.artist,
  album: row.album,
  genre: row.genre,
  subgenre: row.subgenre,
  mood: row.mood,
  coverUrl: getCoverUrl(row),
  audioUrl: getAudioUrl(row),
});

// The two halves of a Goat Mode queue: the Goat's own tracks, and everything
// else the fields call for, already in play order.
async function goatModePool(settings, ratings) {
  if (!settingsHaveSound(settings)) return { others: [], goatTracks: [] };
  const artist = settings.artist ? settings.artist.toLowerCase() : null;
  const goat = settings.goat ? settings.goat.toLowerCase() : null;
  const tags = settings.tags.map(t => t.toLowerCase());
  const ungoat = settings.ungoat.map(a => a.toLowerCase());
  const disliked = (t) => ratings && ratings.get(ratingKey(t.title, t.artist)) === -1;
  const liked = (t) => ratings && ratings.get(ratingKey(t.title, t.artist)) === 1;

  const result = await pool.query(
    `WITH a_sim AS (SELECT DISTINCT lower(similar_artist) AS a FROM seed_tracks WHERE lower(artist) = $1 AND similar_artist IS NOT NULL),
          a_sub AS (SELECT DISTINCT lower(subgenre) AS s FROM seed_tracks WHERE lower(artist) = $1 AND subgenre IS NOT NULL),
          g_sim AS (SELECT DISTINCT lower(similar_artist) AS a FROM seed_tracks WHERE lower(artist) = $2 AND similar_artist IS NOT NULL),
          g_sub AS (SELECT DISTINCT lower(subgenre) AS s FROM seed_tracks WHERE lower(artist) = $2 AND subgenre IS NOT NULL),
          scored AS (
            SELECT ${STATION_TRACK_COLUMNS},
              (CASE WHEN lower(artist) = $1 THEN 3 ELSE 0 END)
              + (CASE WHEN lower(similar_artist) = $1 THEN 4 ELSE 0 END)
              + (CASE WHEN lower(artist) IN (SELECT a FROM a_sim) THEN 4 ELSE 0 END)
              + (CASE WHEN lower(subgenre) IN (SELECT s FROM a_sub) THEN 2 ELSE 0 END)
              + (CASE WHEN lower(similar_artist) = $2 THEN 2 ELSE 0 END)
              + (CASE WHEN lower(artist) IN (SELECT a FROM g_sim) THEN 2 ELSE 0 END)
              + (CASE WHEN lower(subgenre) IN (SELECT s FROM g_sub) THEN 1 ELSE 0 END)
              + 3 * (SELECT COUNT(*) FROM unnest($3::text[]) AS tag
                     WHERE tag IN (lower(genre), lower(subgenre), lower(mood), lower(tag5)))
              AS score
            FROM seed_tracks
            WHERE NOT (lower(artist) = ANY($4::text[]))
              AND ($2::text IS NULL OR lower(artist) <> $2)
          ),
          ranked AS (
            SELECT *, ROW_NUMBER() OVER (PARTITION BY lower(artist) ORDER BY RANDOM()) AS artist_rank
            FROM scored WHERE score > 0
          )
     SELECT * FROM ranked WHERE artist_rank <= 4
     ORDER BY score * (0.4 + RANDOM()) DESC
     LIMIT 90`,
    [artist, goat, tags, ungoat]
  );

  // Strongest matches lead, with enough chance in it that no two visits to
  // the station sound the same; a thumbs up lifts a track, a thumbs down drops it
  const others = result.rows
    .filter(row => !disliked(row))
    .map(row => ({ row, weight: Number(row.score) * (0.4 + Math.random()) * (liked(row) ? 1.6 : 1) }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, STATION_QUEUE_OTHERS)
    .map(({ row }) => mapStationRow(row));
  spreadArtists(others);

  let goatTracks = [];
  if (goat && !ungoat.includes(goat)) {
    const goatResult = await pool.query(
      `SELECT ${STATION_TRACK_COLUMNS} FROM seed_tracks WHERE lower(artist) = $1 ORDER BY RANDOM() LIMIT 40`,
      [goat]
    );
    goatTracks = shapeByRatings(goatResult.rows.map(mapStationRow), ratings);
  }
  return { others, goatTracks };
}

// Keep one artist from playing twice in a row where the queue allows it:
// a track that would repeat the artist before it trades places with the next
// track further on that wouldn't.
function spreadArtists(tracks) {
  const same = (a, b) => (a.artist || '').toLowerCase() === (b.artist || '').toLowerCase();
  for (let i = 1; i < tracks.length; i += 1) {
    if (!same(tracks[i], tracks[i - 1])) continue;
    const swap = tracks.findIndex((t, j) => j > i && !same(t, tracks[i - 1]));
    if (swap === -1) break;
    [tracks[i], tracks[swap]] = [tracks[swap], tracks[i]];
  }
  return tracks;
}

// Deal the Goat's tracks into the queue: one to open, then one after every
// couple of other tracks, for as long as there are Goat tracks left to play.
function mixInGoat(others, goatTracks) {
  if (!goatTracks.length) return others;
  if (!others.length) return goatTracks;
  const queue = [];
  const rest = [...others];
  const goats = [...goatTracks];
  while (rest.length || goats.length) {
    if (goats.length) queue.push(goats.shift());
    for (let i = 0; i < GOAT_EVERY - 1 && rest.length; i += 1) queue.push(rest.shift());
    if (!rest.length) break;
  }
  return queue;
}

async function buildGoatModeQueue(settings, ratings) {
  const { others, goatTracks } = await goatModePool(settings, ratings);
  return mixInGoat(others, goatTracks);
}

// The listener's thumbs, keyed by track, for shaping a station's queue.
async function getUserRatings(userId) {
  const result = await pool.query(
    `SELECT track_title, artist, rating FROM user_play_history
     WHERE user_id = $1 AND rating IS NOT NULL`,
    [userId]
  );
  const ratings = new Map();
  result.rows.forEach(r => ratings.set(ratingKey(r.track_title, r.artist), r.rating));
  return ratings;
}
const ratingKey = (title, artist) => `${(title || '').toLowerCase()}|${(artist || '').toLowerCase()}`;

// Thumbs-down tracks never play; thumbs-up tracks move to the front of the
// group they are in. Everything else keeps its order.
function shapeByRatings(tracks, ratings) {
  if (!ratings || ratings.size === 0) return tracks;
  const liked = [];
  const rest = [];
  tracks.forEach(t => {
    const rating = ratings.get(ratingKey(t.title, t.artist));
    if (rating === -1) return;
    (rating === 1 ? liked : rest).push(t);
  });
  return [...liked, ...rest];
}

// The current UN-GOAT exclusion set for a user ─ empty unless they've toggled
// GOAT mode to 'ungoat', in which case it's their goat_artist plus everyone
// similar_artist-matched to that artist.
async function getExcludedArtists(userId) {
  const userResult = await pool.query(
    `SELECT goat_artist, goat_mode FROM users WHERE id = $1`,
    [userId]
  );
  const { goat_artist, goat_mode } = userResult.rows[0] || {};
  if (!goat_artist || goat_mode !== 'ungoat') return [];

  const similarResult = await pool.query(
    `SELECT DISTINCT artist FROM seed_tracks WHERE similar_artist = $1`,
    [goat_artist]
  );
  return [goat_artist, ...similarResult.rows.map(r => r.artist)];
}

const stationJson = (row) => ({
  id: row.id,
  name: row.name,
  seedArtist: row.seed_artist,
  hue: row.hue,
  position: row.position,
  settings: stationRowSettings(row),
});

// List the user's custom stations plus their GOAT/UN-GOAT slot ─ metadata only
// (name/seedArtist/hue/position); a station's actual track pool is fetched
// lazily, only once the user tunes to it (see the two /tracks endpoints below).
router.get('/radio/stations', requireAuth, async (req, res) => {
  try {
    const stationsResult = await pool.query(
      `SELECT id, name, seed_artist, tags, goat_artist, ungoat_artists, hue, position, created_at
       FROM radio_stations WHERE user_id = $1 ORDER BY created_at ASC`,
      [req.user.id]
    );
    const userResult = await pool.query(
      `SELECT goat_artist, goat_mode, radio_station_styles FROM users WHERE id = $1`,
      [req.user.id]
    );
    const { goat_artist, goat_mode, radio_station_styles } = userResult.rows[0] || {};

    res.json({
      stations: stationsResult.rows.map(stationJson),
      // The built-in stations' Station Panel fields, by station id
      settings: await getBuiltInSettings(req.user.id),
      goat: { artist: goat_artist || null, mode: goat_mode || 'goat' },
      // Sign font + color per station id (built-ins included) — see migration 012
      styles: radio_station_styles || {},
    });
  } catch (err) {
    console.error('List stations error:', err);
    res.status(500).json({ error: 'Failed to load stations.' });
  }
});

// Create a custom station ─ seeded from one artist, auto-populated with their
// catalog + similar-artist matches. hue/position are assigned once here so the
// station's dial blip stays put between sessions.
router.post('/radio/stations', requireAuth, async (req, res) => {
  const { name } = req.body;
  const settings = cleanStationSettings({ ...(req.body.settings || {}), artist: req.body.settings?.artist ?? req.body.seedArtist });
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Give the station a name.' });
  }
  if (!settingsHaveSound(settings)) {
    return res.status(400).json({ error: 'Pick an artist, a tag or a Goat for the station to play from.' });
  }

  try {
    const existingCount = await pool.query(
      `SELECT COUNT(*) FROM radio_stations WHERE user_id = $1`,
      [req.user.id]
    );
    const count = parseInt(existingCount.rows[0].count, 10);
    // Spread stations across the dial (avoiding the built-in stations' fixed
    // spots at the far left/center/far right), with a little jitter so
    // stations created back-to-back don't land exactly on top of each other.
    const position = Math.min(88, 12 + ((count * 19) % 76) + Math.random() * 5);
    const hue = Math.floor(Math.random() * 360);

    const result = await pool.query(
      `INSERT INTO radio_stations (user_id, name, seed_artist, tags, goat_artist, ungoat_artists, hue, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, seed_artist, tags, goat_artist, ungoat_artists, hue, position`,
      [req.user.id, name.trim().slice(0, 100), settings.artist, settings.tags, settings.goat, settings.ungoat, hue, position]
    );

    res.json({ station: stationJson(result.rows[0]) });
  } catch (err) {
    console.error('Create station error:', err);
    res.status(500).json({ error: 'Failed to create station.' });
  }
});

// Restyle a station's sign (font + color) and rename it. :id is a custom
// station's uuid or one of the built-in ids. Hot in Here is the one station
// that never changes its name and can't be deleted. Your Station and GOAT
// have no radio_stations row, so their custom name (and whether the listener
// has removed them from the dial) lives beside their style in
// users.radio_station_styles: { font, color, name? } or { hidden: true }.
const BUILT_IN_STATION_IDS = ['hot-in-here', 'your-station', 'goat'];
const LOCKED_STATION_ID = 'hot-in-here';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.put('/radio/stations/:id/style', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { font, color, name } = req.body || {};
  const isBuiltIn = BUILT_IN_STATION_IDS.includes(id);

  if (!isBuiltIn && !UUID_RE.test(id)) {
    return res.status(404).json({ error: 'Station not found.' });
  }
  if (typeof font !== 'string' || !/^[A-Za-z0-9 ]{1,60}$/.test(font)) {
    return res.status(400).json({ error: 'Pick a font.' });
  }
  if (typeof color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(color)) {
    return res.status(400).json({ error: 'Pick a color.' });
  }

  try {
    let station = null;
    if (!isBuiltIn) {
      const trimmedName = typeof name === 'string' ? name.trim().slice(0, 100) : '';
      const result = await pool.query(
        `UPDATE radio_stations SET name = COALESCE(NULLIF($3, ''), name)
         WHERE id = $1 AND user_id = $2
         RETURNING id, name, seed_artist, tags, goat_artist, ungoat_artists, hue, position`,
        [id, req.user.id, trimmedName]
      );
      const row = result.rows[0];
      if (!row) return res.status(404).json({ error: 'Station not found.' });
      station = stationJson(row);
    }

    const style = { font, color: color.toLowerCase() };
    // A built-in's own name; leaving it blank goes back to the automatic one.
    // Saving a style also puts a removed built-in back on the dial.
    if (isBuiltIn && id !== LOCKED_STATION_ID) {
      const customName = typeof name === 'string' ? name.trim().slice(0, 100) : '';
      if (customName) style.name = customName;
    }
    const styles = await pool.query(
      `UPDATE users SET radio_station_styles = COALESCE(radio_station_styles, '{}'::jsonb) || jsonb_build_object($2::text, $3::jsonb)
       WHERE id = $1 RETURNING radio_station_styles`,
      [req.user.id, id, JSON.stringify(style)]
    );
    res.json({ style, station, styles: styles.rows[0]?.radio_station_styles || {} });
  } catch (err) {
    console.error('Style station error:', err);
    res.status(500).json({ error: 'Failed to save the station style.' });
  }
});

// Delete a station. Custom stations lose their row; Your Station and GOAT
// are taken off the dial (and GOAT lets go of its artist, which also ends any
// UN-GOAT muting). Hot in Here can't be deleted.
router.delete('/radio/stations/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  if (id === LOCKED_STATION_ID) {
    return res.status(403).json({ error: 'Hot in Here cannot be deleted.' });
  }
  if (!BUILT_IN_STATION_IDS.includes(id) && !UUID_RE.test(id)) {
    return res.status(404).json({ error: 'Station not found.' });
  }
  try {
    if (BUILT_IN_STATION_IDS.includes(id)) {
      const result = await pool.query(
        `UPDATE users SET
           radio_station_styles = COALESCE(radio_station_styles, '{}'::jsonb) || jsonb_build_object($2::text, '{"hidden": true}'::jsonb),
           goat_artist = CASE WHEN $2 = 'goat' THEN NULL ELSE goat_artist END,
           goat_mode = CASE WHEN $2 = 'goat' THEN 'goat' ELSE goat_mode END
         WHERE id = $1
         RETURNING radio_station_styles, goat_artist, goat_mode`,
        [req.user.id, id]
      );
      const row = result.rows[0] || {};
      return res.json({
        success: true,
        styles: row.radio_station_styles || {},
        goat: { artist: row.goat_artist || null, mode: row.goat_mode || 'goat' },
      });
    }
    const result = await pool.query(
      `DELETE FROM radio_stations WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Station not found.' });
    }
    // Drop the deleted station's saved sign style too
    await pool.query(
      `UPDATE users SET radio_station_styles = COALESCE(radio_station_styles, '{}'::jsonb) - $2::text WHERE id = $1`,
      [req.user.id, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Delete station error:', err);
    res.status(500).json({ error: 'Failed to delete station.' });
  }
});

// Save a station's four Station Panel fields. A custom station must keep
// something to play from; Hot in Here only takes Un-Goat.
router.put('/radio/stations/:id/settings', requireAuth, async (req, res) => {
  const { id } = req.params;
  let settings = cleanStationSettings(req.body || {});
  try {
    if (id === 'hot-in-here' || id === 'your-station') {
      if (id === 'hot-in-here') settings = { artist: null, tags: [], goat: null, ungoat: settings.ungoat };
      await pool.query(
        `UPDATE users SET radio_station_settings = COALESCE(radio_station_settings, '{}'::jsonb) || jsonb_build_object($2::text, $3::jsonb)
         WHERE id = $1`,
        [req.user.id, id, JSON.stringify(settings)]
      );
      return res.json({ settings, builtIn: await getBuiltInSettings(req.user.id) });
    }
    if (!UUID_RE.test(id)) return res.status(404).json({ error: 'Station not found.' });
    if (!settingsHaveSound(settings)) {
      return res.status(400).json({ error: 'A station needs an artist, a tag or a Goat to play from.' });
    }
    const result = await pool.query(
      `UPDATE radio_stations SET seed_artist = $3, tags = $4, goat_artist = $5, ungoat_artists = $6
       WHERE id = $1 AND user_id = $2
       RETURNING id, name, seed_artist, tags, goat_artist, ungoat_artists, hue, position`,
      [id, req.user.id, settings.artist, settings.tags, settings.goat, settings.ungoat]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Station not found.' });
    res.json({ settings, station: stationJson(result.rows[0]) });
  } catch (err) {
    console.error('Station settings error:', err);
    res.status(500).json({ error: 'Failed to save the station.' });
  }
});

// Tag suggestions for the Station Panel's Tags field: every genre, subgenre,
// mood and tag5 in the catalog that contains what was typed, tags that start
// with it first, then the ones on the most tracks.
router.get('/radio/tags', requireAuth, async (req, res) => {
  const q = cleanText(req.query.q).toLowerCase();
  if (!q) return res.json({ tags: [] });
  try {
    const result = await pool.query(
      `SELECT MIN(tag) AS name, COUNT(*) AS tracks FROM (
         SELECT genre AS tag FROM seed_tracks
         UNION ALL SELECT subgenre FROM seed_tracks
         UNION ALL SELECT mood FROM seed_tracks
         UNION ALL SELECT tag5 FROM seed_tracks
       ) all_tags
       WHERE tag IS NOT NULL AND btrim(tag) <> '' AND lower(tag) LIKE '%' || $1 || '%'
       GROUP BY lower(tag)
       ORDER BY (lower(tag) LIKE $1 || '%') DESC, COUNT(*) DESC
       LIMIT 8`,
      [q]
    );
    res.json({ tags: result.rows.map(r => ({ id: r.name, name: r.name, tracks: Number(r.tracks) })) });
  } catch (err) {
    console.error('Tag search error:', err);
    res.status(500).json({ error: 'Search failed', tags: [] });
  }
});

// A custom station's queue, built from its Station Panel fields
router.get('/radio/stations/:id/tracks', requireAuth, async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Station not found.' });
    const stationResult = await pool.query(
      `SELECT id, name, seed_artist, tags, goat_artist, ungoat_artists, hue, position FROM radio_stations
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    const station = stationResult.rows[0];
    if (!station) {
      return res.status(404).json({ error: 'Station not found.' });
    }

    const tracks = await buildGoatModeQueue(stationRowSettings(station), await getUserRatings(req.user.id));
    res.json({ station: stationJson(station), tracks });
  } catch (err) {
    console.error('Station tracks error:', err);
    res.status(500).json({ error: 'Failed to load station tracks.' });
  }
});

// Set (or change) the GOAT / UN-GOAT slot ─ one seed artist, toggled between
// "play them + similar most" (goat) and "never play them or anyone similar,
// anywhere in Radio" (ungoat, enforced via getExcludedArtists above).
router.put('/radio/goat', requireAuth, async (req, res) => {
  const { artist, mode } = req.body;
  if (mode !== undefined && mode !== 'goat' && mode !== 'ungoat') {
    return res.status(400).json({ error: 'mode must be "goat" or "ungoat".' });
  }

  try {
    const fields = [];
    const values = [];
    let i = 1;
    if (artist !== undefined) { fields.push(`goat_artist = $${i++}`); values.push(artist || null); }
    // Picking a GOAT puts the station back on the dial if it had been removed
    if (artist) fields.push(`radio_station_styles = COALESCE(radio_station_styles, '{}'::jsonb) #- '{goat,hidden}'`);
    if (mode !== undefined) { fields.push(`goat_mode = $${i++}`); values.push(mode); }
    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nothing to update.' });
    }
    values.push(req.user.id);

    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${i} RETURNING goat_artist, goat_mode`,
      values
    );
    res.json({ goat: { artist: result.rows[0].goat_artist, mode: result.rows[0].goat_mode } });
  } catch (err) {
    console.error('Set GOAT error:', err);
    res.status(500).json({ error: 'Failed to update GOAT station.' });
  }
});

// The GOAT station's track pool ─ only meaningful in 'goat' mode; in 'ungoat'
// mode this station plays nothing (its whole purpose there is exclusion, applied
// to every other station via getExcludedArtists).
router.get('/radio/goat/tracks', requireAuth, async (req, res) => {
  try {
    const userResult = await pool.query(
      `SELECT goat_artist, goat_mode FROM users WHERE id = $1`,
      [req.user.id]
    );
    const { goat_artist, goat_mode } = userResult.rows[0] || {};
    if (!goat_artist) {
      return res.json({ artist: null, mode: goat_mode || 'goat', tracks: [] });
    }
    if (goat_mode === 'ungoat') {
      return res.json({ artist: goat_artist, mode: 'ungoat', tracks: [] });
    }

    const tracks = await buildGoatModeQueue(cleanStationSettings({ goat: goat_artist }), await getUserRatings(req.user.id));
    res.json({ artist: goat_artist, mode: 'goat', tracks });
  } catch (err) {
    console.error('GOAT tracks error:', err);
    res.status(500).json({ error: 'Failed to load GOAT station.' });
  }
});


// Email/password registration
router.post('/register', register);

// Email/password login
router.post('/login',
  passport.authenticate('local', { session: false }),
  login
);

// Get current user (protected route)
router.get('/me', requireAuth, getMe);

// Google OAuth
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user.id, email: req.user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    res.redirect(`http://localhost:19006/auth/google/success?token=${token}`);
  }
);

// Update profile — favorite_artists (listener taste picker) plus, now, the
// same fields the musician onboarding flow collects (display_name/artist name,
// location, genre, subgenre, mood, sound_description), so EditProfilePanel can
// let an artist fix a typo or change their answers after signup without
// deleting and recreating the account. The SET clause is built dynamically from
// whichever fields are actually present in the body, so this one endpoint still
// works unchanged for the listener's favorite-artists-only update. ──
router.put('/update-profile', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const {
      favorite_artists, display_name, location, genre, subgenre, mood, sound_description,
    } = req.body;

    const fields = [];
    const values = [];
    let i = 1;

    if (favorite_artists !== undefined) {
      fields.push(`favorite_artists = $${i++}`);
      values.push(JSON.stringify(favorite_artists));
    }
    if (display_name !== undefined) {
      fields.push(`display_name = $${i++}`);
      values.push(display_name?.trim() || null);
    }
    if (location !== undefined) {
      fields.push(`location = $${i++}`);
      values.push(location?.trim() || null);
    }
    if (genre !== undefined) {
      fields.push(`genre = $${i++}`);
      values.push(genre || null);
    }
    if (subgenre !== undefined) {
      fields.push(`subgenre = $${i++}`);
      values.push(subgenre || null);
    }
    if (mood !== undefined) {
      fields.push(`mood = $${i++}`);
      values.push(mood || null);
    }
    if (sound_description !== undefined) {
      // Same 30-char cap enforced at signup (register in authController.js) — backstopped
      // here too in case a caller skips the form's own maxLength.
      fields.push(`sound_description = $${i++}`);
      values.push(sound_description ? sound_description.trim().slice(0, 30) : null);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }

    values.push(decoded.id);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${i}`, values);

    res.json({ success: true });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Permanently delete the current user's account. Most of what they own cascades
// automatically via ON DELETE CASCADE on the users row (playlists → playlist_tracks,
// playlist_follows, user_follows — see schema.sql and migrations 004/005). Tracks
// they uploaded are deliberately NOT deleted: seed_tracks.uploader_user_id is
// ON DELETE SET NULL (migration 006), so their uploads stay in the shared catalog,
// just unattributed — same as how track deletion already leaves the catalog intact
// for everyone else. user_play_history and user_search_selections aren't declared
// in any tracked schema file (see the schema-drift note — enriched_db/seed_tracks
// evolved outside schema.sql, and these two tables did too), so this can't assume
// they cascade; they're cleared explicitly in the same transaction instead.
router.delete('/account', requireAuth, async (req, res) => {
  // ── A real transaction needs one dedicated client — pool.query() (this file's
  // `pool` is actually config/db.js's { query, pool } wrapper) borrows a fresh
  // connection per call, so BEGIN/COMMIT would land on different connections.
  // Same pattern as playlistController.js's reorderPlaylistTracks. ──
  const client = await pool.pool.connect();
  try {
    const userResult = await client.query('SELECT profile_picture FROM users WHERE id = $1', [req.user.id]);
    const avatarUrl = userResult.rows[0]?.profile_picture || null;

    await client.query('BEGIN');
    await client.query('DELETE FROM user_play_history WHERE user_id = $1', [req.user.id]);
    await client.query('DELETE FROM user_search_selections WHERE user_id = $1', [req.user.id]);
    await client.query('DELETE FROM users WHERE id = $1', [req.user.id]);
    await client.query('COMMIT');

    // Best-effort — an avatar file missing on disk shouldn't undo an otherwise
    // successful account deletion.
    deleteUploadedFile(avatarUrl);

    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Failed to delete your account. Please try again.' });
  } finally {
    client.release();
  }
});

// Change password — works the same for a listener or an artist account, requires
// the current password to verify identity before setting a new one. A Google-only
// account (password_hash never set at signup — see the Google strategy in
// config/passport.js) gets a clear error instead of a confusing bcrypt.compare
// failure against a null hash.
router.put('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Please fill out both password fields.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  }

  try {
    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];

    if (!user?.password_hash) {
      return res.status(400).json({ error: 'This account signed up with Google and has no password to change.' });
    }

    const matches = await bcrypt.compare(currentPassword, user.password_hash);
    if (!matches) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    // Same cost factor as signup (authController.js's register) so an existing
    // password changed here hashes to the same strength as a brand new one.
    const newHash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);

    res.json({ success: true });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to change your password. Please try again.' });
  }
});

// Search seed_tracks by artist or title
router.get('/search', async (req, res) => {
  const { q, type, genres } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters.' });
  }

  // ── Optional genre filter, shared with Discovery's selectedGenres — applied only
  // to the artist/album/track branches below (musician/user results have no genre
  // and are always unaffected by this filter). ──
  const genreList = genres ? genres.split(',').map(g => g.trim()).filter(Boolean) : null;

  try {
    // ── Normalize query — strip punctuation, collapse spaces, lowercase ──
    const normalizedQuery = q.trim().toLowerCase()
      .replace(/['']/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // ── Also strip leading "the " for better matching ──
    const stripped = normalizedQuery.startsWith('the ')
      ? normalizedQuery.slice(4).trim()
      : normalizedQuery;

    const SIMILARITY_THRESHOLD = 0.15;

    let query, params;

    if (type === 'artist') {
      query = `
        SELECT DISTINCT ON (artist) artist, genre
        FROM seed_tracks
        WHERE
          similarity(LOWER(artist), $1) > $3
          OR similarity(LOWER(artist), $2) > $3
          OR LOWER(artist) LIKE '%' || $2 || '%'
        ORDER BY artist, GREATEST(similarity(LOWER(artist), $1), similarity(LOWER(artist), $2)) DESC
        LIMIT 10
      `;
      params = [normalizedQuery, stripped, SIMILARITY_THRESHOLD];
    } else if (type === 'track') {
      query = `
        SELECT title, artist, album, genre
        FROM seed_tracks
        WHERE
          similarity(LOWER(title), $1) > $3
          OR similarity(LOWER(title), $2) > $3
          OR LOWER(title) LIKE '%' || $2 || '%'
        ORDER BY GREATEST(similarity(LOWER(title), $1), similarity(LOWER(title), $2)) DESC
        LIMIT 10
      `;
      params = [normalizedQuery, stripped, SIMILARITY_THRESHOLD];
   } else {
  query = `
    (
      SELECT DISTINCT ON (artist)
        'artist' as type,
        artist as name,
        genre,
        NULL as album,
        NULL as artist_name,
        cover,
        NULL as filename,
        is_user_upload,
        uploaded_audio_url,
        uploaded_cover_url,
        NULL::uuid as user_id,
        NULL as username,
        NULL as profile_picture,
        GREATEST(
          similarity(LOWER(artist), $1),
          similarity(LOWER(artist), $2)
        ) as score
      FROM seed_tracks
      WHERE
        (
          similarity(LOWER(artist), $1) > $3
          OR similarity(LOWER(artist), $2) > $3
          OR LOWER(artist) LIKE '%' || $2 || '%'
        )
        AND ($4::text[] IS NULL OR genre = ANY($4))
      ORDER BY artist, score DESC
      LIMIT 5
    )
    UNION ALL
    (
      SELECT DISTINCT ON (artist, album)
        'album' as type,
        album as name,
        genre,
        album,
        artist as artist_name,
        cover,
        NULL as filename,
        is_user_upload,
        uploaded_audio_url,
        uploaded_cover_url,
        NULL::uuid as user_id,
        NULL as username,
        NULL as profile_picture,
        GREATEST(
          similarity(LOWER(album), $1),
          similarity(LOWER(album), $2)
        ) as score
      FROM seed_tracks
      WHERE
        album IS NOT NULL AND album != ''
        AND (
          similarity(LOWER(album), $1) > $3
          OR similarity(LOWER(album), $2) > $3
          OR LOWER(album) LIKE '%' || $2 || '%'
        )
        AND ($4::text[] IS NULL OR genre = ANY($4))
      ORDER BY artist, album, score DESC
      LIMIT 5
    )
    UNION ALL
    (
      SELECT
        'track' as type,
        title as name,
        genre,
        album,
        artist as artist_name,
        cover,
        filename,
        is_user_upload,
        uploaded_audio_url,
        uploaded_cover_url,
        NULL::uuid as user_id,
        NULL as username,
        NULL as profile_picture,
        GREATEST(
          similarity(LOWER(title), $1),
          similarity(LOWER(title), $2)
        ) as score
      FROM seed_tracks
      WHERE
        (
          similarity(LOWER(title), $1) > $3
          OR similarity(LOWER(title), $2) > $3
          OR LOWER(title) LIKE '%' || $2 || '%'
        )
        AND ($4::text[] IS NULL OR genre = ANY($4))
      ORDER BY score DESC
      LIMIT 5
    )
    UNION ALL
    (
      SELECT
        'musician' as type,
        COALESCE(display_name, username) as name,
        NULL as genre,
        NULL as album,
        NULL as artist_name,
        NULL as cover,
        NULL as filename,
        NULL::boolean as is_user_upload,
        NULL as uploaded_audio_url,
        NULL as uploaded_cover_url,
        id as user_id,
        username,
        profile_picture,
        GREATEST(
          similarity(LOWER(username), $1),
          similarity(LOWER(COALESCE(display_name, '')), $1)
        ) as score
      FROM users
      WHERE
        is_artist = true
        AND (
          similarity(LOWER(username), $1) > $3
          OR similarity(LOWER(COALESCE(display_name, '')), $1) > $3
          OR LOWER(username) LIKE '%' || $2 || '%'
          OR LOWER(COALESCE(display_name, '')) LIKE '%' || $2 || '%'
        )
      ORDER BY score DESC
      LIMIT 5
    )
    UNION ALL
    (
      SELECT
        'user' as type,
        COALESCE(display_name, username) as name,
        NULL as genre,
        NULL as album,
        NULL as artist_name,
        NULL as cover,
        NULL as filename,
        NULL::boolean as is_user_upload,
        NULL as uploaded_audio_url,
        NULL as uploaded_cover_url,
        id as user_id,
        username,
        profile_picture,
        GREATEST(
          similarity(LOWER(username), $1),
          similarity(LOWER(COALESCE(display_name, '')), $1)
        ) as score
      FROM users
      WHERE
        is_artist = false
        AND (
          similarity(LOWER(username), $1) > $3
          OR similarity(LOWER(COALESCE(display_name, '')), $1) > $3
          OR LOWER(username) LIKE '%' || $2 || '%'
          OR LOWER(COALESCE(display_name, '')) LIKE '%' || $2 || '%'
        )
      ORDER BY score DESC
      LIMIT 5
    )
    ORDER BY score DESC
    LIMIT 15
  `;
  params = [normalizedQuery, stripped, SIMILARITY_THRESHOLD, genreList];
    }

    const result = await pool.query(query, params);
    const mapped = result.rows.map(r => {
      if (r.type === 'musician' || r.type === 'user') {
        return {
          ...r,
          coverUrl: r.profile_picture || null,
          audioUrl: null,
        };
      }
      return {
        ...r,
        coverUrl: getCoverUrl({ ...r, artist: r.artist_name }),
        audioUrl: getAudioUrl({ ...r, artist: r.artist_name }),
      };
    });
    res.json({ results: mapped });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get another user's public profile — username, display name, avatar, taste, and
// only their PUBLIC playlists (private ones stay private to everyone but the owner).
router.get('/users/:username', requireAuth, async (req, res) => {
  const { username } = req.params;

  try {
    const userResult = await pool.query(
      `SELECT id, username, display_name, profile_picture, favorite_artists, is_artist,
              (SELECT COUNT(*)::int FROM user_follows WHERE followed_id = users.id) AS followers_count,
              (SELECT COUNT(*)::int FROM user_follows WHERE follower_id = users.id) AS following_count,
              EXISTS(
                SELECT 1 FROM user_follows
                WHERE follower_id = $2 AND followed_id = users.id
              ) AS is_following,
              EXISTS(
                SELECT 1 FROM user_blocks
                WHERE blocker_id = $2 AND blocked_id = users.id
              ) AS is_blocked
       FROM users WHERE username = $1`,
      [username, req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const profile = userResult.rows[0];

    const playlistsResult = await pool.query(
      `SELECT p.id, p.title, p.description, p.cover_art_url, p.is_public,
              p.created_at, p.updated_at,
              COUNT(pt.id)::int AS track_count
       FROM playlists p
       LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.id
       WHERE p.user_id = $1 AND p.is_public = true
       GROUP BY p.id
       ORDER BY p.updated_at DESC`,
      [profile.id]
    );

    res.json({
      user: {
        username: profile.username,
        display_name: profile.display_name,
        profile_picture: profile.profile_picture,
        favorite_artists: profile.favorite_artists,
        is_artist: profile.is_artist,
        followers_count: profile.followers_count,
        following_count: profile.following_count,
        is_following: profile.is_following,
        is_blocked: profile.is_blocked,
      },
      playlists: playlistsResult.rows,
    });
  } catch (err) {
    console.error('Get public profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Musicians and other users the current user follows — powers the "Musicians You
// Follow" / "People You Follow" rows in ProfilePanel, split the same way search
// results are (is_artist true vs false). Placed ahead of /users/:username in this
// file only for readability; route shape (/users/me/following, two segments) never
// collides with /users/:username (one segment) regardless of order.
router.get('/users/me/following', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.username, u.display_name, u.profile_picture, u.is_artist, u.genre
       FROM user_follows uf
       JOIN users u ON u.id = uf.followed_id
       WHERE uf.follower_id = $1
       ORDER BY uf.created_at DESC`,
      [req.user.id]
    );

    const musicians = [];
    const people = [];
    for (const row of result.rows) {
      const entry = {
        username: row.username,
        name: row.display_name || row.username,
        profilePicture: row.profile_picture,
        genre: row.genre,
      };
      if (row.is_artist) musicians.push(entry);
      else people.push(entry);
    }

    res.json({ musicians, people });
  } catch (err) {
    console.error('Get following error:', err);
    res.status(500).json({ error: 'Failed to fetch following list.' });
  }
});

// Follow another user
router.post('/users/:username/follow', requireAuth, async (req, res) => {
  const { username } = req.params;

  try {
    const targetResult = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (targetResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const targetId = targetResult.rows[0].id;

    if (targetId === req.user.id) {
      return res.status(400).json({ error: "You can't follow yourself." });
    }

    await pool.query(
      `INSERT INTO user_follows (follower_id, followed_id) VALUES ($1, $2)
       ON CONFLICT (follower_id, followed_id) DO NOTHING`,
      [req.user.id, targetId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Follow user error:', err);
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

// Unfollow another user
router.delete('/users/:username/follow', requireAuth, async (req, res) => {
  const { username } = req.params;

  try {
    const targetResult = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (targetResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const targetId = targetResult.rows[0].id;

    await pool.query(
      'DELETE FROM user_follows WHERE follower_id = $1 AND followed_id = $2',
      [req.user.id, targetId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Unfollow user error:', err);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

// Get random tracks for discovery
router.get('/tracks/random', async (req, res) => {
  const { limit = 10 } = req.query;
  try {
    const result = await pool.query(
      `SELECT title, artist, album, genre, cover, filename
       FROM seed_tracks
       ORDER BY RANDOM()
       LIMIT $1`,
      [parseInt(limit)]
    );
    const tracks = result.rows.map(buildTrackUrls);
    res.json({ tracks });
  } catch (err) {
    console.error('Random tracks error:', err);
    res.status(500).json({ error: 'Failed to fetch tracks' });
  }
});

// Get albums for the Discovery feed — genre-filtered if genres provided, otherwise personalized via history
router.get('/albums/discover', requireAuth, async (req, res) => {
  const { genres, limit = 15 } = req.query;

  try {
    let result;

    // ── Place filter (Discovery's Place tab): `places` is a JSON array of
    // tokens ("p:<placeId>" or "a:<artist>"), `near` a radius in miles from
    // the listener's home city. All of them are OR'd together, then AND'd
    // with the genre filter. See services/geo.js. ──
    const placeTokens = geo.parsePlaceTokens(req.query.places);
    const nearRadius = geo.parseNearRadius(req.query.near);
    const placeFilterRequested = placeTokens.length > 0 || !!nearRadius;
    const placeSpecs = placeFilterRequested
      ? await geo.resolvePlaceSpecs({ tokens: placeTokens, nearRadius, userId: req.user.id })
      : [];

    if (genres || placeFilterRequested) {
      // ── Filter mode — up to 5 genres OR'd together, AND any picked places ──
      const genreList = geo.parseGenres(genres);
      const params = [];
      const conds = [];
      if (genreList.length) {
        params.push(genreList);
        conds.push(`genre = ANY($${params.length})`);
      }
      // A place filter that resolved to nothing (e.g. "near me" with no home
      // city saved) must return nothing, not silently fall back to everywhere.
      conds.push(placeFilterRequested ? (geo.specsSql(placeSpecs, params) || 'FALSE') : 'TRUE');
      params.push(parseInt(limit) * 3);

      result = await pool.query(
        `SELECT DISTINCT ON (artist, album)
          artist, album, genre, cover, filename, is_user_upload, uploaded_audio_url, uploaded_cover_url
        FROM (
          SELECT * FROM seed_tracks
          WHERE album IS NOT NULL AND album != ''
            AND ${conds.join(' AND ')}
          ORDER BY RANDOM()
          LIMIT 1000
        ) randomized
        LIMIT $${params.length}`,
        params
      );
    } else {
      // ── No genre filter — personalize using onboarding favorite artists (weighted heavily) + play history ──
      const userResult = await pool.query(
        `SELECT favorite_artists FROM users WHERE id = $1`,
        [req.user.id]
      );
      // favorite_artists is stored as an array of {name, coverUrl, ...} objects from the
      // MusicBrainz autocomplete picked during onboarding, not plain strings — normalize
      // to names before using it to match seed_tracks.artist.
      const favoriteArtists = (userResult.rows[0]?.favorite_artists || [])
        .map(a => (typeof a === 'string' ? a : a?.name))
        .filter(Boolean);

      const historyResult = await pool.query(
        `SELECT DISTINCT artist, genre FROM user_play_history WHERE user_id = $1`,
        [req.user.id]
      );
      const historyArtists = historyResult.rows.map(r => r.artist);
      const historyGenres = [...new Set(historyResult.rows.map(r => r.genre).filter(Boolean))];

      if (favoriteArtists.length === 0 && historyArtists.length === 0) {
        // ── Brand new user, no signal at all yet — fall back to fully random ──
        result = await pool.query(
          `SELECT DISTINCT ON (artist, album)
            artist, album, genre, cover, filename, is_user_upload, uploaded_audio_url, uploaded_cover_url
          FROM (
            SELECT * FROM seed_tracks
            WHERE album IS NOT NULL AND album != ''
            ORDER BY RANDOM()
            LIMIT 1000
          ) randomized
          LIMIT $1`,
          [parseInt(limit) * 3]
        );
      } else {
        // ── Weighted query: favorite artists OR history artists OR history genres, favorites get priority via UNION ordering ──
        result = await pool.query(
          `SELECT * FROM (
            (
              SELECT DISTINCT ON (artist, album)
                artist, album, genre, cover, filename, is_user_upload, uploaded_audio_url, uploaded_cover_url, 2 as weight
              FROM (
                SELECT * FROM seed_tracks
                WHERE album IS NOT NULL AND album != ''
                  AND artist = ANY($1)
                ORDER BY RANDOM()
                LIMIT 500
              ) randomized_favorites
              LIMIT $3
            )
            UNION ALL
            (
              SELECT DISTINCT ON (artist, album)
                artist, album, genre, cover, filename, is_user_upload, uploaded_audio_url, uploaded_cover_url, 1 as weight
              FROM (
                SELECT * FROM seed_tracks
                WHERE album IS NOT NULL AND album != ''
                  AND (artist = ANY($2) OR genre = ANY($4))
                  AND NOT (artist = ANY($1))
                ORDER BY RANDOM()
                LIMIT 500
              ) randomized_history
              LIMIT $3
            )
          ) AS combined
          ORDER BY weight DESC, RANDOM()
          LIMIT $5`,
          [favoriteArtists, historyArtists, parseInt(limit) * 2, historyGenres, parseInt(limit) * 3]
        );
      }
    }

    // ── Shuffle and trim to requested limit, resolve real cover/audio URLs ──
    const shuffled = result.rows.sort(() => Math.random() - 0.5).slice(0, parseInt(limit));

    const albums = shuffled.map(row => ({
      artist: row.artist,
      album: row.album,
      genre: row.genre,
      coverUrl: getCoverUrl(row),
      audioUrl: getAudioUrl(row),
    }));

    res.json({ albums });
  } catch (err) {
    console.error('Discover albums error:', err);
    res.status(500).json({ error: 'Failed to fetch discovery albums' });
  }
});

// Get full artist detail — albums grouped, plus tags
router.get('/artists/detail', async (req, res) => {
  const { name } = req.query;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Artist name is required.' });
  }

  try {
    const result = await pool.query(
      `SELECT title, album, genre, subgenre, similar_artist, mood, cover, filename,
              is_user_upload, uploaded_audio_url, uploaded_cover_url
       FROM seed_tracks
       WHERE artist = $1
       ORDER BY album`,
      [name]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Artist not found.' });
    }

    // ── Group tracks by album ──
    const albumMap = new Map();
    for (const row of result.rows) {
      if (!row.album) continue;
      if (!albumMap.has(row.album)) {
        albumMap.set(row.album, {
          album: row.album,
          trackCount: 0,
          cover: row.cover,
          filename: row.filename,
          is_user_upload: row.is_user_upload,
          uploaded_audio_url: row.uploaded_audio_url,
          uploaded_cover_url: row.uploaded_cover_url,
        });
      }
      albumMap.get(row.album).trackCount += 1;
    }

    const albums = Array.from(albumMap.values()).map(a => ({
      album: a.album,
      trackCount: a.trackCount,
      coverUrl: getCoverUrl(a),
      audioUrl: getAudioUrl({ ...a, artist: name }),
    }));

    // ── Collect unique tags across all tracks ──
    const genres = [...new Set(result.rows.map(r => r.genre).filter(Boolean))];
    const subgenres = [...new Set(result.rows.map(r => r.subgenre).filter(Boolean))];
    const similarArtists = [...new Set(result.rows.map(r => r.similar_artist).filter(Boolean))];
    const moods = [...new Set(result.rows.map(r => r.mood).filter(Boolean))];

    // ── Background image: cover of the album with the most tracks ──
    const backgroundAlbum = albums.sort((a, b) => b.trackCount - a.trackCount)[0];

    res.json({
      artist: name,
      backgroundUrl: backgroundAlbum?.coverUrl || null,
      albums,
      genres,
      subgenres,
      similarArtists,
      moods,
    });
  } catch (err) {
    console.error('Artist detail error:', err);
    res.status(500).json({ error: 'Failed to fetch artist detail' });
  }
});

// Get full album detail — tracklist in order
router.get('/albums/detail', async (req, res) => {
  const { artist, album } = req.query;
  if (!artist || !album) {
    return res.status(400).json({ error: 'Artist and album are required.' });
  }

  try {
    const result = await pool.query(
      `SELECT title, track_number, length_seconds, genre, cover, filename,
              is_user_upload, uploaded_audio_url, uploaded_cover_url
      FROM seed_tracks
      WHERE artist = $1 AND album = $2
      ORDER BY
        CASE WHEN track_number ~ '^[0-9]+$' THEN track_number::int ELSE 999 END`,
      [artist, album]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Album not found.' });
    }

    // ── Per-track resolution, not one shared album-level cover — a musician's own
    // upload carries its own uploaded_cover_url distinct from any catalog cover, and
    // even within the catalog this is more correct than assuming every track on an
    // album shares exactly the first row's cover. ──
    const tracks = result.rows.map((row, i) => ({
      trackNumber: row.track_number || String(i + 1),
      title: row.title,
      lengthSeconds: row.length_seconds,
      coverUrl: getCoverUrl(row),
      audioUrl: getAudioUrl({ ...row, artist, album }),
    }));

    res.json({
      artist,
      album,
      coverUrl: getCoverUrl(result.rows[0]),
      genre: result.rows[0].genre,
      tracks,
    });
  } catch (err) {
    console.error('Album detail error:', err);
    res.status(500).json({ error: 'Failed to fetch album detail' });
  }
});

// Get random albums for discovery (one random track per album for preview audio)
router.get('/albums/random', async (req, res) => {
  const { limit = 15 } = req.query;
  try {
    const result = await pool.query(
      `SELECT DISTINCT ON (artist, album)
        artist, album, genre, cover, filename, is_user_upload, uploaded_audio_url, uploaded_cover_url
       FROM seed_tracks
       WHERE album IS NOT NULL AND album != ''
       ORDER BY artist, album, RANDOM()
       LIMIT $1`,
      [parseInt(limit) * 3] // overfetch since we'll shuffle and trim after grouping
    );

    // ── Shuffle the album list and trim to requested limit ──
    const shuffled = result.rows.sort(() => Math.random() - 0.5).slice(0, parseInt(limit));

    const albums = shuffled.map(row => ({
      artist: row.artist,
      album: row.album,
      genre: row.genre,
      coverUrl: getCoverUrl(row),
      audioUrl: getAudioUrl(row),
    }));

    res.json({ albums });
  } catch (err) {
    console.error('Random albums error:', err);
    res.status(500).json({ error: 'Failed to fetch albums' });
  }
});

// Get tracks similar to a given track, based on genre and similar_artist
router.get('/tracks/similar', async (req, res) => {
  const { artist, genre, limit = 8 } = req.query;

  try {
    let similarArtists = [];
    if (artist) {
      const tagResult = await pool.query(
        `SELECT DISTINCT similar_artist FROM seed_tracks WHERE artist = $1 AND similar_artist IS NOT NULL`,
        [artist]
      );
      similarArtists = tagResult.rows.map(r => r.similar_artist).filter(Boolean);
    }

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (similarArtists.length > 0) {
      conditions.push(`artist = ANY($${paramIndex})`);
      params.push(similarArtists);
      paramIndex++;
    }

    if (genre) {
      conditions.push(`genre = $${paramIndex}`);
      params.push(genre);
      paramIndex++;
    }

    if (artist) {
      conditions.push(`artist != $${paramIndex}`);
      params.push(artist);
      paramIndex++;
    }

    if (conditions.length === 0) {
      return res.json({ tracks: [] });
    }

    const whereClause = conditions.length > 1
      ? `(${conditions.slice(0, -1).filter((_, i) => i < conditions.length - (artist ? 1 : 0)).join(' OR ')})${artist ? ` AND ${conditions[conditions.length - 1]}` : ''}`
      : conditions[0];

    params.push(parseInt(limit));
    const limitParam = paramIndex;

    const result = await pool.query(
      `SELECT title, artist, album, genre, cover, filename
       FROM seed_tracks
       WHERE ${whereClause}
       ORDER BY RANDOM()
       LIMIT $${limitParam}`,
      params
    );

    const tracks = result.rows.map(buildTrackUrls);
    res.json({ tracks });
  } catch (err) {
    console.error('Similar tracks error:', err);
    res.status(500).json({ error: 'Failed to fetch similar tracks' });
  }
});

// Search unique artists from seed_tracks
router.get('/artists/search', async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ artists: [] });
  }
  try {
    const result = await pool.query(
      `SELECT DISTINCT ON (artist)
        artist as name,
        genre,
        cover,
        is_user_upload,
        uploaded_cover_url
       FROM seed_tracks
       WHERE LOWER(artist) LIKE $1
       ORDER BY artist
       LIMIT 8`,
      [`%${q.trim().toLowerCase()}%`]
    );
    const artists = result.rows.map(r => ({
      id: r.name,
      name: r.name,
      genre: r.genre,
      coverUrl: getCoverUrl(r),
    }));
    res.json({ artists });
  } catch (err) {
    console.error('Artist search error:', err);
    res.status(500).json({ error: 'Search failed', artists: [] });
  }
});

// New releases — most recently seeded tracks
router.get('/tracks/new-releases', async (req, res) => {
  const { limit = 10 } = req.query;
  try {
    const result = await pool.query(
      `SELECT title, artist, album, genre, cover, filename
       FROM seed_tracks
       ORDER BY created_at DESC
       LIMIT $1`,
      [parseInt(limit)]
    );
    const tracks = result.rows.map(buildTrackUrls);
    res.json({ tracks });
  } catch (err) {
    console.error('New releases error:', err);
    res.status(500).json({ error: 'Failed to fetch new releases' });
  }
});

// Suggested tracks by genre
router.get('/tracks/suggested', async (req, res) => {
  const { genres, limit = 10 } = req.query;
  try {
    let result;
    if (genres) {
      const genreList = genres.split(',').map(g => g.trim());
      result = await pool.query(
        `SELECT title, artist, album, genre, cover, filename
         FROM seed_tracks
         WHERE genre = ANY($1)
         ORDER BY RANDOM()
         LIMIT $2`,
        [genreList, parseInt(limit)]
      );
    } else {
      result = await pool.query(
        `SELECT title, artist, album, genre, cover, filename
         FROM seed_tracks
         ORDER BY RANDOM()
         LIMIT $1`,
        [parseInt(limit)]
      );
    }
    const tracks = result.rows.map(buildTrackUrls);
    res.json({ tracks });
  } catch (err) {
    console.error('Suggested tracks error:', err);
    res.status(500).json({ error: 'Failed to fetch suggested tracks' });
  }
});

// Record a track play in the user's permanent listening history (upsert, no duplicates)
router.post('/history/play', requireAuth, async (req, res) => {
  const { title, artist, album, genre } = req.body;
  if (!title || !artist) {
    return res.status(400).json({ error: 'Title and artist are required.' });
  }

  try {
    await pool.query(
      `INSERT INTO user_play_history (user_id, track_title, artist, album, genre)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, track_title, artist)
       DO UPDATE SET
         last_played_at = NOW(),
         play_count = user_play_history.play_count + 1`,
      [req.user.id, title, artist, album || null, genre || null]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Play history error:', err);
    res.status(500).json({ error: 'Failed to record play history' });
  }
});

// Record a track selected specifically from search results (upsert, no duplicates)
router.post('/history/search-selection', requireAuth, async (req, res) => {
  const { title, artist, album, genre } = req.body;
  if (!title || !artist) {
    return res.status(400).json({ error: 'Title and artist are required.' });
  }

  try {
    await pool.query(
      `INSERT INTO user_search_selections (user_id, track_title, artist, album, genre)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, track_title, artist) DO NOTHING`,
      [req.user.id, title, artist, album || null, genre || null]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Search selection history error:', err);
    res.status(500).json({ error: 'Failed to record search selection' });
  }
});

// Record a thumbs up/down rating on a track ─ personalized signal (distinct from
// seed_tracks.thumb_up/thumb_down's global counters). Upserts into the same
// user_play_history row play history already uses, so rating a track straight
// from a Radio station (before it's technically "played") still works.
router.post('/history/rate', requireAuth, async (req, res) => {
  const { title, artist, album, genre, rating } = req.body;
  if (!title || !artist) {
    return res.status(400).json({ error: 'Title and artist are required.' });
  }
  if (rating !== 1 && rating !== -1 && rating !== 0) {
    return res.status(400).json({ error: 'rating must be 1, -1, or 0 to clear.' });
  }

  try {
    // 0 takes the thumb back; the play history row itself stays
    if (rating === 0) {
      await pool.query(
        `UPDATE user_play_history SET rating = NULL
         WHERE user_id = $1 AND track_title = $2 AND artist = $3`,
        [req.user.id, title, artist]
      );
      return res.json({ success: true, rating: null });
    }

    await pool.query(
      `INSERT INTO user_play_history (user_id, track_title, artist, album, genre, rating)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, track_title, artist)
       DO UPDATE SET rating = $6`,
      [req.user.id, title, artist, album || null, genre || null, rating]
    );
    res.json({ success: true, rating });
  } catch (err) {
    console.error('Rate track error:', err);
    res.status(500).json({ error: 'Failed to rate track.' });
  }
});

// Every track this user has thumbed up or down, so the Radio tuner can show
// the thumbs already lit when one of those tracks comes round again.
router.get('/history/ratings', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT track_title AS title, artist, rating
       FROM user_play_history
       WHERE user_id = $1 AND rating IS NOT NULL`,
      [req.user.id]
    );
    res.json({ ratings: result.rows });
  } catch (err) {
    console.error('Get ratings error:', err);
    res.status(500).json({ error: 'Failed to load ratings.' });
  }
});

// Get the user's most recent activity — merged play history and search selections, deduplicated by track
router.get('/history/recent', requireAuth, async (req, res) => {
  const { limit = 10 } = req.query;

  try {
    const result = await pool.query(
      `SELECT track_title, artist, album, genre, activity_at FROM (
        SELECT track_title, artist, album, genre, last_played_at as activity_at
        FROM user_play_history
        WHERE user_id = $1
        UNION ALL
        SELECT track_title, artist, album, genre, selected_at as activity_at
        FROM user_search_selections
        WHERE user_id = $1
      ) combined_activity
      ORDER BY activity_at DESC`,
      [req.user.id]
    );

    // ── Deduplicate by track identity, keeping the first (most recent) occurrence ──
    const seen = new Set();
    const deduped = [];
    for (const row of result.rows) {
      const key = `${row.track_title}|${row.artist}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(row);
      }
    }

    const trimmed = deduped.slice(0, parseInt(limit));

    // ── Look up real cover/filename for each track from seed_tracks, then resolve real URLs ──
    const tracks = await Promise.all(trimmed.map(async (row) => {
      const seedResult = await pool.query(
        `SELECT cover, filename, is_user_upload, uploaded_audio_url, uploaded_cover_url
         FROM seed_tracks WHERE title = $1 AND artist = $2 LIMIT 1`,
        [row.track_title, row.artist]
      );
      const seedRow = seedResult.rows[0];

      return {
        title: row.track_title,
        artist: row.artist,
        album: row.album,
        genre: row.genre,
        coverUrl: seedRow ? getCoverUrl(seedRow) : null,
        audioUrl: seedRow ? getAudioUrl({ ...seedRow, artist: row.artist, album: row.album }) : `http://localhost:5000/audio/dummy.mp3`,
      };
    }));

    res.json({ tracks });
  } catch (err) {
    console.error('Recent activity error:', err);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});

// Get personalized home feed tracks — seeded from user's full play history, merged and shuffled
router.get('/home/feed', requireAuth, async (req, res) => {
  const { limit = 20 } = req.query;

  try {
    // ── Get all tracks from user's play history as seeds ──
    const historyResult = await pool.query(
      `SELECT track_title, artist, genre FROM user_play_history
       WHERE user_id = $1
       ORDER BY last_played_at DESC`,
      [req.user.id]
    );

    const historyTracks = historyResult.rows;

    // ── If no history yet, fall back to favorite artists or pure random ──
    if (historyTracks.length === 0) {
      const userResult = await pool.query(
        `SELECT favorite_artists FROM users WHERE id = $1`,
        [req.user.id]
      );
      // Same normalization as the discovery-feed query above — favorite_artists holds
      // {name, coverUrl, ...} objects, not plain strings.
      const favoriteArtists = (userResult.rows[0]?.favorite_artists || [])
        .map(a => (typeof a === 'string' ? a : a?.name))
        .filter(Boolean);

      let fallbackResult;
      if (favoriteArtists.length > 0) {
        fallbackResult = await pool.query(
          `SELECT title, artist, album, genre, cover, filename, length_seconds,
                  is_user_upload, uploaded_audio_url, uploaded_cover_url
           FROM seed_tracks
           WHERE artist = ANY($1)
           ORDER BY RANDOM()
           LIMIT $2`,
          [favoriteArtists, parseInt(limit)]
        );
      } else {
        fallbackResult = await pool.query(
          `SELECT title, artist, album, genre, cover, filename, length_seconds,
                  is_user_upload, uploaded_audio_url, uploaded_cover_url
           FROM seed_tracks
           ORDER BY RANDOM()
           LIMIT $1`,
          [parseInt(limit)]
        );
      }

      const tracks = fallbackResult.rows.map(buildTrackUrls).map(t => ({
        title: t.title,
        artist: t.artist,
        album: t.album,
        genre: t.genre,
        length_seconds: t.length_seconds,
        coverUrl: t.coverUrl,
        audioUrl: t.audioUrl,
        similarTo: null,
      }));
      return res.json({ tracks });
    }

    // ── For each history track, fetch a small batch of similar tracks ──
    const tracksPerSeed = Math.max(2, Math.ceil(parseInt(limit) / historyTracks.length));
    const seen = new Set();
    const allTracks = [];

    for (const seed of historyTracks) {
      const similar = await pool.query(
        `SELECT title, artist, album, genre, cover, filename, length_seconds,
                is_user_upload, uploaded_audio_url, uploaded_cover_url
         FROM seed_tracks
         WHERE (
           artist IN (
             SELECT DISTINCT similar_artist FROM seed_tracks
             WHERE artist = $1 AND similar_artist IS NOT NULL
           )
           OR genre = $2
         )
         AND artist != $1
         ORDER BY RANDOM()
         LIMIT $3`,
        [seed.artist, seed.genre, tracksPerSeed]
      );

      for (const row of similar.rows) {
        const key = `${row.title}|${row.artist}`;
        if (!seen.has(key)) {
          seen.add(key);
          const resolved = buildTrackUrls(row);
          allTracks.push({
            title: row.title,
            artist: row.artist,
            album: row.album,
            genre: row.genre,
            length_seconds: row.length_seconds,
            coverUrl: resolved.coverUrl,
            audioUrl: resolved.audioUrl,
            similarTo: seed.artist, 
          });
        }
      }
    }

    // ── Shuffle the merged pool and trim to requested limit ──
    const shuffled = allTracks.sort(() => Math.random() - 0.5).slice(0, parseInt(limit));
    res.json({ tracks: shuffled });

  } catch (err) {
    console.error('Home feed error:', err);
    res.status(500).json({ error: 'Failed to fetch home feed' });
  }
});

// Increment thumb_up count on a track — global like counter
router.post('/tracks/like', requireAuth, async (req, res) => {
  const { title, artist } = req.body;
  if (!title || !artist) {
    return res.status(400).json({ error: 'Title and artist are required.' });
  }

  try {
    const result = await pool.query(
      `UPDATE seed_tracks
       SET thumb_up = COALESCE(thumb_up, 0) + 1
       WHERE title = $1 AND artist = $2
       RETURNING thumb_up`,
      [title, artist]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Track not found.' });
    }

    res.json({ success: true, thumbUp: result.rows[0].thumb_up });
  } catch (err) {
    console.error('Track like error:', err);
    res.status(500).json({ error: 'Failed to like track' });
  }
});

// Increment thumb_down count on a track — global dislike counter
router.post('/tracks/dislike', requireAuth, async (req, res) => {
  const { title, artist } = req.body;
  if (!title || !artist) {
    return res.status(400).json({ error: 'Title and artist are required.' });
  }

  try {
    const result = await pool.query(
      `UPDATE seed_tracks
       SET thumb_down = COALESCE(thumb_down, 0) + 1
       WHERE title = $1 AND artist = $2
       RETURNING thumb_down`,
      [title, artist]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Track not found.' });
    }

    res.json({ success: true, thumbDown: result.rows[0].thumb_down });
  } catch (err) {
    console.error('Track dislike error:', err);
    res.status(500).json({ error: 'Failed to dislike track' });
  }
});

module.exports = router;