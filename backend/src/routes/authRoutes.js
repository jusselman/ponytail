const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');
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

module.exports = router;