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

// Google OAuth - initiates the flow
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google OAuth - callback after Google authenticates
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user.id, email: req.user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    // Redirect to frontend with token
    res.redirect(`http://localhost:19006/auth/google/success?token=${token}`);
  }
);

// Add backend endpoint to save the artists
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
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Artist search endpoint
router.get('/artists/search', async (req, res) => {
  const { q } = req.query;
  try {
    const response = await fetch(
      `https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(q)}&limit=6&fmt=json`,
      { headers: { 'User-Agent': 'Ponytail/1.0 (ponytailapp@example.com)' } }
    );
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;