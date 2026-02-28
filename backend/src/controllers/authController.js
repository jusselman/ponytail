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
  const { email, username, password, display_name } = req.body;

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

    // Insert user
    const result = await db.query(
      `INSERT INTO users (email, username, display_name, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, username, display_name, created_at`,
      [email, username, display_name || username, password_hash]
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
    }
  });
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, email, username, display_name, avatar_url, is_artist, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch user.' });
  }
};

module.exports = { register, login, getMe };