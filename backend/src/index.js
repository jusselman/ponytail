// Load backend/.env and check it before anything else runs (SECURITY_RISKS.md SR-52)
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('./config/checkEnv')();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
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

const app = express();

// Safety net: whatever a route sends back, a password hash is never included,
// even if a whole user row is passed to res.json by mistake (SECURITY_RISKS.md SR-13)
const NEVER_SENT = new Set(['password_hash']);
app.set('json replacer', (key, value) => (NEVER_SENT.has(key) ? undefined : value));

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
  // Sign-in uses a token in the Authorization header, not cookies, so the
  // browser is never told to send cookies to the API (SECURITY_RISKS.md SR-12)
  origin: ['http://localhost:8081', 'http://localhost:19006'],
}));
app.use(express.json());
app.use('/api', require('./middleware/rateLimits').general);
app.use(passport.initialize());

// ── Static assets ──
// Every media folder only serves image and audio files, sandboxed so nothing in
// them can run as a page (SECURITY_RISKS.md SR-01, SR-58)
app.use('/uploads', guardUploadsStatic, express.static(path.join(__dirname, '../assets/uploads')));
app.use('/covers', guardUploadsStatic, express.static(path.join(__dirname, '../assets/dev_seed/covers')));
app.use('/audio', guardUploadsStatic, express.static(path.join(__dirname, '../assets/dev_seed/mp3')));
app.use('/vinyl', guardUploadsStatic, express.static(path.join(__dirname, '../assets/dev_seed/VinylCases')));

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

// Only this computer can reach the backend unless HOST says otherwise, so
// nobody else on the same Wi-Fi can use the API or download the catalog
// (SECURITY_RISKS.md SR-56, SR-57). To test on a phone over Wi-Fi, set
// HOST=0.0.0.0 in backend/.env, restart, and set it back afterwards.
const HOST = process.env.HOST || '127.0.0.1';
app.listen(PORT, HOST, () => {
  const reach = HOST === '127.0.0.1' || HOST === 'localhost'
    ? 'this computer only'
    : 'other devices on the network too (HOST in backend/.env)';
  console.log(`Server running on port ${PORT}, reachable from ${reach}`);
});