const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('./config/passport');
const authRoutes = require('./routes/authRoutes');
const playlistRoutes = require('./routes/playlistRoutes');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(cors({
  origin: ['http://localhost:8081', 'http://localhost:19006'],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

// ── Static assets ──
app.use('/uploads', express.static(path.join(__dirname, '../assets/uploads')));
app.use('/covers', express.static(path.join(__dirname, '../assets/dev_seed/covers')));
app.use('/audio', express.static(path.join(__dirname, '../assets/dev_seed/mp3')));
app.use('/vinyl', express.static(path.join(__dirname, '../assets/dev_seed/VinylCases')));

// ── Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/playlists', playlistRoutes);

// ── Health check ──
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Ponytail API is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});