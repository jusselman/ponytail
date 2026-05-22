const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { register, login, getMe } = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

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

// ── Improved Artist Search Endpoint ─────────────────────────────────────
router.get('/artists/search', async (req, res) => {
  const { q } = req.query;

  if (!q || q.length < 2) {
    return res.json({ artists: [] });
  }

  try {
    const response = await fetch(
      `https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(q)}&limit=6&fmt=json`,
      {
        headers: {
          'User-Agent': 'Ponytail/1.0 (https://ponytail.app; contact@ponytail.app)', // MusicBrainz requires a proper User-Agent
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!response.ok) {
      console.error(`MusicBrainz returned ${response.status} for query: "${q}"`);
      // Return empty list instead of crashing frontend
      return res.json({ artists: [] });
    }

    const data = await response.json();
    const artists = (data.artists || []).map(a => ({
      id: a.id,
      name: a.name,
      disambiguation: a.disambiguation || null,
    }));

    res.json({ artists });

  } catch (err) {
    console.error('MusicBrainz proxy error for query "' + q + '":', err.message);

    // Return graceful fallback so frontend doesn't break
    res.json({ artists: [] });
  }
});


// Search seed_tracks by artist or title
router.get('/search', async (req, res) => {
  const { q, type } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters.' });
  }
  try {
    const search = `%${q.trim().toLowerCase()}%`;
    let query, params;

    if (type === 'artist') {
      query = `
        SELECT DISTINCT ON (artist) artist, genre
        FROM seed_tracks
        WHERE LOWER(artist) LIKE $1
        ORDER BY artist
        LIMIT 10
      `;
      params = [search];
    } else if (type === 'track') {
      query = `
        SELECT title, artist, album, genre
        FROM seed_tracks
        WHERE LOWER(title) LIKE $1
        ORDER BY title
        LIMIT 10
      `;
      params = [search];
    } else {
      // Default: search both artists and tracks
      query = `
        (
          SELECT DISTINCT ON (artist)
            'artist' as type,
            artist as name,
            genre,
            NULL as album,
            NULL as artist_name
          FROM seed_tracks
          WHERE LOWER(artist) LIKE $1
          ORDER BY artist
          LIMIT 5
        )
        UNION ALL
        (
          SELECT
            'track' as type,
            title as name,
            genre,
            album,
            artist as artist_name
          FROM seed_tracks
          WHERE LOWER(title) LIKE $1
          ORDER BY title
          LIMIT 5
        )
        LIMIT 10
      `;
      params = [search];
    }

    const result = await pool.query(query, params);
    res.json({ results: result.rows });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;