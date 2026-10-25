const fs = require('fs');
const path = require('path');

// ── Upload safety ──
// The browser says what kind of file it is sending (file.mimetype), and the
// original filename comes from the user's computer. Neither can be trusted: a
// file named "photo.html" labelled "image/png" would otherwise be saved as
// .html and served from /uploads as a web page on our own domain.
//
// So: (1) the server picks the extension from a fixed list, never the original
// filename, and (2) after the file is saved we read its first bytes and check
// they really are that kind of file. Anything that fails is deleted.

const ALLOWED = {
  // images
  'image/jpeg':  { ext: '.jpg',  kind: 'image', sig: ['jpeg'] },
  'image/png':   { ext: '.png',  kind: 'image', sig: ['png'] },
  'image/webp':  { ext: '.webp', kind: 'image', sig: ['webp'] },
  'image/gif':   { ext: '.gif',  kind: 'image', sig: ['gif'] },
  // audio
  'audio/mpeg':  { ext: '.mp3',  kind: 'audio', sig: ['id3', 'mpegFrame'] },
  'audio/mp3':   { ext: '.mp3',  kind: 'audio', sig: ['id3', 'mpegFrame'] },
  'audio/wav':   { ext: '.wav',  kind: 'audio', sig: ['wav'] },
  'audio/x-wav': { ext: '.wav',  kind: 'audio', sig: ['wav'] },
  'audio/mp4':   { ext: '.m4a',  kind: 'audio', sig: ['ftyp'] },
  'audio/aac':   { ext: '.aac',  kind: 'audio', sig: ['id3', 'mpegFrame'] },
  'audio/ogg':   { ext: '.ogg',  kind: 'audio', sig: ['ogg'] },
};

// Extensions /uploads is allowed to serve. Anything else 404s.
const SERVABLE_EXTENSIONS = new Set(Object.values(ALLOWED).map((a) => a.ext));

const ascii = (buf, start, end) => buf.subarray(start, end).toString('latin1');

// "Magic bytes": the fixed signature each format starts with
const SIGNATURES = {
  jpeg:      (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  png:       (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  gif:       (b) => ['GIF87a', 'GIF89a'].includes(ascii(b, 0, 6)),
  webp:      (b) => ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP',
  wav:       (b) => ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WAVE',
  ogg:       (b) => ascii(b, 0, 4) === 'OggS',
  ftyp:      (b) => ascii(b, 4, 8) === 'ftyp',
  id3:       (b) => ascii(b, 0, 3) === 'ID3',
  mpegFrame: (b) => b[0] === 0xff && (b[1] & 0xe0) === 0xe0, // MP3 / AAC (ADTS) frame sync
};

const extensionFor = (mimetype) => ALLOWED[mimetype]?.ext;

// For multer's fileFilter. kind = 'image' | 'audio'
const isAllowed = (mimetype, kind) => ALLOWED[mimetype]?.kind === kind;

// For multer's diskStorage filename: `${prefix}-${userId}-${timestamp}${ext}`
const safeFilename = (prefix, userId, mimetype) =>
  `${prefix}-${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extensionFor(mimetype)}`;

const readHead = (filePath) => {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(16);
    const n = fs.readSync(fd, buf, 0, 16, 0);
    return buf.subarray(0, n);
  } finally {
    fs.closeSync(fd);
  }
};

const contentMatches = (file) => {
  const rule = ALLOWED[file.mimetype];
  if (!rule) return false;
  try {
    const head = readHead(file.path);
    return rule.sig.some((name) => SIGNATURES[name](head));
  } catch {
    return false;
  }
};

const removeQuietly = (filePath) => fs.unlink(filePath, () => {});

// Express middleware: run straight after a multer middleware. Checks every
// saved file; if any one is not what it claims to be, deletes all of them and
// answers 400 so nothing half-saved is left behind.
const verifyUploads = (req, res, next) => {
  const files = [
    ...(req.file ? [req.file] : []),
    ...(Array.isArray(req.files) ? req.files : Object.values(req.files || {}).flat()),
  ];
  if (files.length === 0) return next();

  const bad = files.find((f) => !contentMatches(f));
  if (!bad) return next();

  files.forEach((f) => removeQuietly(f.path));
  return res.status(400).json({
    error: bad.mimetype.startsWith('audio/')
      ? "That audio file doesn't look like a real MP3, WAV, M4A, AAC or OGG file."
      : "That image doesn't look like a real JPG, PNG, WEBP or GIF file.",
  });
};

// Static-serving guard for /uploads: only known media extensions, and the
// response is sandboxed so even a mislabelled file can never run script.
const guardUploadsStatic = (req, res, next) => {
  const ext = path.extname(req.path).toLowerCase();
  if (!SERVABLE_EXTENSIONS.has(ext)) return res.status(404).end();
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
};

// Resolve a stored /uploads/ URL to a path inside uploadDir, or null.
// path.basename strips any "../" so a crafted URL can never point outside it.
const uploadPathFromUrl = (uploadDir, publicUrl) => {
  const name = String(publicUrl || '').split('/uploads/')[1];
  if (!name) return null;
  const base = path.basename(decodeURIComponent(name));
  return base ? path.join(uploadDir, base) : null;
};

module.exports = {
  isAllowed,
  extensionFor,
  safeFilename,
  verifyUploads,
  guardUploadsStatic,
  uploadPathFromUrl,
};
