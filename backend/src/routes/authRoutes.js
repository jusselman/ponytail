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
    ORDER BY score DESC
    LIMIT 15
  `;
  params = [normalizedQuery, stripped, SIMILARITY_THRESHOLD];
    }

    const result = await pool.query(query, params);
    const mapped = result.rows.map(r => ({
      ...r,
      coverUrl: resolveCover(r.cover)
        ? `http://localhost:5000/covers/${encodeURIComponent(resolveCover(r.cover))}`
        : null,
      audioUrl: resolveAudio(r.artist_name, r.album, r.filename)
        ? `http://localhost:5000/audio/${resolveAudio(r.artist_name, r.album, r.filename).split('/').map(encodeURIComponent).join('/')}`
        : null,
    }));
    res.json({ results: mapped });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
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

module.exports = router;