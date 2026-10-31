const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('./config/passport');
const authRoutes = require('./routes/authRoutes');
const playlistRoutes = require('./routes/playlistRoutes');
const messageRoutes = require('./routes/messageRoutes');
const blockRoutes = require('./routes/blockRoutes');
const placesRoutes = require('./routes/placesRoutes');
const bulletinRoutes = require('./routes/bulletinRoutes');
const tipRoutes = require('./routes/tipRoutes');
const claimRoutes = require('./routes/claimRoutes');
const path = require('path');
const { guardUploadsStatic } = require('./utils/uploads');
require('dotenv').config();

const app = express();

// Behind a hosting proxy or load balancer (most production setups), set
// TRUST_PROXY=1 so rate limits see each visitor's real address instead of the
// proxy's. The value is the number of proxies in front of the app (usually 1).
// Only a number is accepted: "true" would trust any X-Forwarded-For header a
// visitor sends, letting them fake a new address and dodge every limit.
// Leave it unset when running locally.
const proxyHops = Number.parseInt(process.env.TRUST_PROXY, 10);
if (Number.isInteger(proxyHops) && proxyHops > 0) app.set('trust proxy', proxyHops);
else if (process.env.TRUST_PROXY) console.warn('TRUST_PROXY must be a number of proxies (e.g. 1); ignoring it.');
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
app.use('/api', require('./middleware/rateLimits').general);
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

// ── Static assets ──
app.use('/uploads', guardUploadsStatic, express.static(path.join(__dirname, '../assets/uploads')));
app.use('/covers', express.static(path.join(__dirname, '../assets/dev_seed/covers')));
app.use('/audio', express.static(path.join(__dirname, '../assets/dev_seed/mp3')));
app.use('/vinyl', express.static(path.join(__dirname, '../assets/dev_seed/VinylCases')));

// ── Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/blocks', blockRoutes);
app.use('/api/places', placesRoutes);
app.use('/api/bulletin', bulletinRoutes);
app.use('/api/tips', tipRoutes);
app.use('/api/claims', claimRoutes);

// ── Health check ──
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Ponytail API is running' });
});

// ── Last-resort error handler ──
// Upload problems (wrong type, too big) become a plain 400. Anything else is
// logged here on the server and the client only gets a generic message, never
// a stack trace or file paths.
const multer = require('multer');
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'That file is too large.' : 'Upload failed.';
    return res.status(400).json({ error: message });
  }
  if (/^Invalid .*(file|image) type$|^Unexpected field$/.test(err.message || '')) {
    return res.status(400).json({ error: err.message });
  }
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ error: 'Something went wrong.' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});