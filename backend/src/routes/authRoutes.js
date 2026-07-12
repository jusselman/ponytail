const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { register, login, getMe } = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ── Cache directory listings at startup for fast fuzzy matching ──
const COVERS_ROOT = path.join(__dirname, '../../assets/dev_seed/covers');
const MP3_ROOT = path.join(__dirname, '../../assets/dev_seed/mp3');

const normalize = (s) => s
  .toLowerCase()
  .replace(/\b(and|feat|ft|with|vs)\b/g, '') // strip common connector words
  .replace(/[^a-z0-9]/g, '');

// ── Build a normalized lookup map once: normalized name -> real filename ──
const buildNormalizedMap = (files) => {
  const map = new Map();
  for (const f of files) {
    map.set(normalize(f), f);
  }
  return map;
};

let coversMap = new Map();
let artistFoldersMap = new Map(); // normalized artist name -> real folder name

try {
  const coverFiles = fs.readdirSync(COVERS_ROOT);
  coversMap = buildNormalizedMap(coverFiles);
  console.log(`Cached ${coversMap.size} cover filenames for fuzzy matching.`);
} catch (err) {
  console.error('Failed to read covers directory:', err.message);
}

try {
  const artistFolders = fs.readdirSync(MP3_ROOT);
  artistFoldersMap = buildNormalizedMap(artistFolders);
  console.log(`Cached ${artistFoldersMap.size} artist folders for fuzzy matching.`);
} catch (err) {
  console.error('Failed to read mp3 directory:', err.message);
}

// ── Cache album folders per artist, built lazily on first access ──
const albumFoldersCache = new Map(); // realArtistFolder -> Map(normalized album -> real folder)

const getAlbumMap = (realArtistFolder) => {
  if (albumFoldersCache.has(realArtistFolder)) {
    return albumFoldersCache.get(realArtistFolder);
  }
  try {
    const albums = fs.readdirSync(path.join(MP3_ROOT, realArtistFolder));
    const map = buildNormalizedMap(albums);
    albumFoldersCache.set(realArtistFolder, map);
    return map;
  } catch {
    const empty = new Map();
    albumFoldersCache.set(realArtistFolder, empty);
    return empty;
  }
};

// ── Cache track filenames per album, built lazily on first access ──
const trackFilesCache = new Map(); // "artistFolder/albumFolder" -> Map(normalized filename -> real filename)

const getTrackMap = (realArtistFolder, realAlbumFolder) => {
  const key = `${realArtistFolder}/${realAlbumFolder}`;
  if (trackFilesCache.has(key)) {
    return trackFilesCache.get(key);
  }
  try {
    const tracks = fs.readdirSync(path.join(MP3_ROOT, realArtistFolder, realAlbumFolder));
    const map = buildNormalizedMap(tracks);
    trackFilesCache.set(key, map);
    return map;
  } catch {
    const empty = new Map();
    trackFilesCache.set(key, empty);
    return empty;
  }
};

// ── Resolve a cover path using the cached normalized map ──
const resolveCover = (coverPath) => {
  if (!coverPath) return null;
  const filename = coverPath.replace(/^\/?bin\/covers\//, '');
  const real = coversMap.get(normalize(filename));
  return real || null;
};

// ── Resolve an audio path using cached normalized maps, lazily built ──
const resolveAudio = (artist, album, filename) => {
  if (!artist || !album || !filename) return null;
  const bareFilename = filename.replace(/^bin\/mp3\//, '');

  const realArtistFolder = artistFoldersMap.get(normalize(artist));
  if (!realArtistFolder) return null;

  const albumMap = getAlbumMap(realArtistFolder);
  const realAlbumFolder = albumMap.get(normalize(album));
  if (!realAlbumFolder) return null;

  const trackMap = getTrackMap(realArtistFolder, realAlbumFolder);
  const realTrackFile = trackMap.get(normalize(bareFilename));
  if (!realTrackFile) return null;

  return `${realArtistFolder}/${realAlbumFolder}/${realTrackFile}`;
};

// ── Build full coverUrl and audioUrl using cached fuzzy resolution ──
const buildTrackUrls = (track) => {
  const realCover = resolveCover(track.cover);
  const realAudioPath = resolveAudio(track.artist, track.album, track.filename);

  return {
    ...track,
    coverUrl: realCover
      ? `http://localhost:5000/covers/${encodeURIComponent(realCover)}`
      : null,
    audioUrl: realAudioPath
      ? `http://localhost:5000/audio/${realAudioPath.split('/').map(encodeURIComponent).join('/')}`
      : `http://localhost:5000/audio/dummy.mp3`,
  };
};

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

// Update profile (favorite artists, etc.)
router.put('/update-profile', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { favorite_artists } = req.body;

    await pool.query(
      'UPDATE users SET favorite_artists = $1 WHERE id = $2',
      [JSON.stringify(favorite_artists), decoded.id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Search seed_tracks by artist or title
router.get('/search', async (req, res) => {
  const { q, type } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters.' });
  }

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
        NULL::uuid as user_id,
        NULL as username,
        NULL as profile_picture,
        GREATEST(
          similarity(LOWER(artist), $1),
          similarity(LOWER(artist), $2)
        ) as score
      FROM seed_tracks
      WHERE
        similarity(LOWER(artist), $1) > $3
        OR similarity(LOWER(artist), $2) > $3
        OR LOWER(artist) LIKE '%' || $2 || '%'
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
        NULL::uuid as user_id,
        NULL as username,
        NULL as profile_picture,
        GREATEST(
          similarity(LOWER(title), $1),
          similarity(LOWER(title), $2)
        ) as score
      FROM seed_tracks
      WHERE
        similarity(LOWER(title), $1) > $3
        OR similarity(LOWER(title), $2) > $3
        OR LOWER(title) LIKE '%' || $2 || '%'
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
  params = [normalizedQuery, stripped, SIMILARITY_THRESHOLD];
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
        coverUrl: resolveCover(r.cover)
          ? `http://localhost:5000/covers/${encodeURIComponent(resolveCover(r.cover))}`
          : null,
        audioUrl: resolveAudio(r.artist_name, r.album, r.filename)
          ? `http://localhost:5000/audio/${resolveAudio(r.artist_name, r.album, r.filename).split('/').map(encodeURIComponent).join('/')}`
          : null,
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
              ) AS is_following
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
      },
      playlists: playlistsResult.rows,
    });
  } catch (err) {
    console.error('Get public profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
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

    if (genres) {
      // ── Genre filter mode — up to 5 genres, OR'd together ──
      const genreList = genres.split(',').map(g => g.trim()).slice(0, 5);

     result = await pool.query(
        `SELECT DISTINCT ON (artist, album)
          artist, album, genre, cover, filename
        FROM (
          SELECT * FROM seed_tracks
          WHERE album IS NOT NULL AND album != ''
            AND genre = ANY($1)
          ORDER BY RANDOM()
          LIMIT 1000
        ) randomized
        LIMIT $2`,
        [genreList, parseInt(limit) * 3]
      );
    } else {
      // ── No genre filter — personalize using onboarding favorite artists (weighted heavily) + play history ──
      const userResult = await pool.query(
        `SELECT favorite_artists FROM users WHERE id = $1`,
        [req.user.id]
      );
      const favoriteArtists = userResult.rows[0]?.favorite_artists || [];

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
            artist, album, genre, cover, filename
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
                artist, album, genre, cover, filename, 2 as weight
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
                artist, album, genre, cover, filename, 1 as weight
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

    const albums = shuffled.map(row => {
      const realCover = resolveCover(row.cover);
      const realAudioPath = resolveAudio(row.artist, row.album, row.filename);
      return {
        artist: row.artist,
        album: row.album,
        genre: row.genre,
        coverUrl: realCover
          ? `http://localhost:5000/covers/${encodeURIComponent(realCover)}`
          : null,
        audioUrl: realAudioPath
          ? `http://localhost:5000/audio/${realAudioPath.split('/').map(encodeURIComponent).join('/')}`
          : `http://localhost:5000/audio/dummy.mp3`,
      };
    });

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
      `SELECT title, album, genre, subgenre, similar_artist, mood, cover, filename
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
        });
      }
      albumMap.get(row.album).trackCount += 1;
    }

    const albums = Array.from(albumMap.values()).map(a => {
      const realCover = resolveCover(a.cover);
      const realAudioPath = resolveAudio(name, a.album, a.filename);
      return {
        album: a.album,
        trackCount: a.trackCount,
        coverUrl: realCover
          ? `http://localhost:5000/covers/${encodeURIComponent(realCover)}`
          : null,
        audioUrl: realAudioPath
          ? `http://localhost:5000/audio/${realAudioPath.split('/').map(encodeURIComponent).join('/')}`
          : `http://localhost:5000/audio/dummy.mp3`,
      };
    });

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
      `SELECT title, track_number, length_seconds, genre, cover, filename
      FROM seed_tracks
      WHERE artist = $1 AND album = $2
      ORDER BY 
        CASE WHEN track_number ~ '^[0-9]+$' THEN track_number::int ELSE 999 END`,
      [artist, album]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Album not found.' });
    }

    const realCover = resolveCover(result.rows[0].cover);
    const coverUrl = realCover
      ? `http://localhost:5000/covers/${encodeURIComponent(realCover)}`
      : null;

    const tracks = result.rows.map((row, i) => {
      const realAudioPath = resolveAudio(artist, album, row.filename);
      return {
        trackNumber: row.track_number || String(i + 1),
        title: row.title,
        lengthSeconds: row.length_seconds,
        coverUrl,
        audioUrl: realAudioPath
          ? `http://localhost:5000/audio/${realAudioPath.split('/').map(encodeURIComponent).join('/')}`
          : `http://localhost:5000/audio/dummy.mp3`,
      };
    });

    res.json({
      artist,
      album,
      coverUrl,
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
        artist, album, genre, cover, filename
       FROM seed_tracks
       WHERE album IS NOT NULL AND album != ''
       ORDER BY artist, album, RANDOM()
       LIMIT $1`,
      [parseInt(limit) * 3] // overfetch since we'll shuffle and trim after grouping
    );

    // ── Shuffle the album list and trim to requested limit ──
    const shuffled = result.rows.sort(() => Math.random() - 0.5).slice(0, parseInt(limit));

    const albums = shuffled.map(row => {
      const realCover = resolveCover(row.cover);
      const realAudioPath = resolveAudio(row.artist, row.album, row.filename);
      return {
        artist: row.artist,
        album: row.album,
        genre: row.genre,
        coverUrl: realCover
          ? `http://localhost:5000/covers/${encodeURIComponent(realCover)}`
          : null,
        audioUrl: realAudioPath
          ? `http://localhost:5000/audio/${realAudioPath.split('/').map(encodeURIComponent).join('/')}`
          : `http://localhost:5000/audio/dummy.mp3`,
      };
    });

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
        cover
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
      coverUrl: resolveCover(r.cover)
        ? `http://localhost:5000/covers/${encodeURIComponent(resolveCover(r.cover))}`
        : null,
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
        `SELECT cover, filename FROM seed_tracks WHERE title = $1 AND artist = $2 LIMIT 1`,
        [row.track_title, row.artist]
      );
      const seedRow = seedResult.rows[0];

      const realCover = seedRow ? resolveCover(seedRow.cover) : null;
      const realAudioPath = seedRow ? resolveAudio(row.artist, row.album, seedRow.filename) : null;

      return {
        title: row.track_title,
        artist: row.artist,
        album: row.album,
        genre: row.genre,
        coverUrl: realCover
          ? `http://localhost:5000/covers/${encodeURIComponent(realCover)}`
          : null,
        audioUrl: realAudioPath
          ? `http://localhost:5000/audio/${realAudioPath.split('/').map(encodeURIComponent).join('/')}`
          : `http://localhost:5000/audio/dummy.mp3`,
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
      const favoriteArtists = userResult.rows[0]?.favorite_artists || [];

      let fallbackResult;
      if (favoriteArtists.length > 0) {
        fallbackResult = await pool.query(
          `SELECT title, artist, album, genre, cover, filename, length_seconds
           FROM seed_tracks
           WHERE artist = ANY($1)
           ORDER BY RANDOM()
           LIMIT $2`,
          [favoriteArtists, parseInt(limit)]
        );
      } else {
        fallbackResult = await pool.query(
          `SELECT title, artist, album, genre, cover, filename, length_seconds
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
        `SELECT title, artist, album, genre, cover, filename, length_seconds
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