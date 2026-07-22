const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// POST /api/auth/register
const register = async (req, res) => {
  // is_artist is self-declared at signup by the separate musician registration flow —
  // instant, no approval step, per product decision. Regular/listener signup never
  // sends this field, so it defaults to false exactly as before.
  //
  // location/genre/subgenre/mood/sound_description are the musician onboarding's
  // extra steps (city, Tag 1/2/4/5 in the enriched_db.csv vocabulary) — only sent
  // by the musician signup flow, always null/undefined for listener signup. These
  // seed both the personalized radio station and the track upload endpoint, which
  // stamps every new upload with these same values instead of asking per track.
  const {
    email, username, password, display_name, is_artist,
    location, genre, subgenre, mood, sound_description,
  } = req.body;

  try {
    // Check if email already exists
    const existingEmail = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    if (existingEmail.rows.length > 0) {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    // Check if username already exists
    const existingUsername = await db.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );
    if (existingUsername.rows.length > 0) {
      return res.status(409).json({ error: 'That username is already taken.' });
    }

    // Hash password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Sound description is capped at 30 characters — enforced client-side in the
    // onboarding form and backstopped by a CHECK constraint on the column, but
    // trim defensively here too in case a caller skips the form entirely.
    const trimmedSoundDescription = sound_description
      ? sound_description.trim().slice(0, 30)
      : null;

    // Insert user
    const result = await db.query(
      `INSERT INTO users (email, username, display_name, password_hash, is_artist,
                          location, genre, subgenre, mood, sound_description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, email, username, display_name, is_artist,
                 location, genre, subgenre, mood, sound_description, created_at`,
      [
        email, username, display_name || username, password_hash, Boolean(is_artist),
        location || null, genre || null, subgenre || null, mood || null, trimmedSoundDescription,
      ]
    );

    const user = result.rows[0];
    const token = generateToken(user);

    res.status(201).json({ token, user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  // Passport local strategy handles validation
  // If we reach here, req.user is populated
  const token = generateToken(req.user);
  res.json({
    token,
    user: {
      id: req.user.id,
      email: req.user.email,
      username: req.user.username,
      display_name: req.user.display_name,
      is_artist: req.user.is_artist,
    }
  });
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, email, username, display_name, favorite_artists, profile_picture, is_artist,
              location, genre, subgenre, mood, sound_description,
              (SELECT COUNT(*)::int FROM user_follows WHERE followed_id = users.id) AS followers_count,
              (SELECT COUNT(*)::int FROM user_follows WHERE follower_id = users.id) AS following_count
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch user.' });
  }
};

module.exports = { register, login, getMe };