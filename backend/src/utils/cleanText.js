// ── Cleaning text people send ──
// Unicode has invisible characters that change the direction text is drawn in,
// so a name stored as RLO + "daehoidaR" displays as "Radiohead" and slips past
// the reserved-name check (SECURITY_RISKS.md SR-61). Other invisible characters
// can make a name look blank or identical to someone else's. And unlimited
// lengths let one huge name wreck every screen it appears on (SR-62).
//
// Two levels:
//   cleanText  every text value in every request (see cleanRequestBody):
//              removes direction overrides, control codes and hidden "tag"
//              characters. Keeps line breaks, and keeps the joiners emoji need,
//              so posts and messages look the same as typed.
//   cleanLine  names and titles: cleanText, plus removes blank-looking filler
//              characters, turns any run of spaces or line breaks into one
//              space, and cuts to a maximum length.

const DIRECTION_AND_CONTROL =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F؜‎‏‪-‮⁦-⁩]|[\u{E0000}-\u{E007F}]/gu;

// Characters that draw as nothing (or as blank space) but aren't spaces
const BLANK_LOOKALIKES = /[­͏ᅟᅠ឴឵᠎​⁠-⁤ㅤ﻿ﾠ]/g;

// Longest allowed, in characters
const LIMITS = {
  displayName: 50,     // display and artist names
  location: 100,
  playlistTitle: 100,
  playlistDescription: 500,
  trackTitle: 150,
  album: 150,
};

const cleanText = (value) =>
  String(value ?? '').normalize('NFC').replace(/\r\n?/g, '\n').replace(DIRECTION_AND_CONTROL, '');

// Counts characters, not UTF-16 units, so emoji are never cut in half
const cut = (s, max) => Array.from(s).slice(0, max).join('');

const cleanLine = (value, max) =>
  cut(cleanText(value).replace(BLANK_LOOKALIKES, '').replace(/\s+/g, ' ').trim(), max).trim();

const cleanParagraph = (value, max) => cut(cleanText(value).trim(), max).trim();

// Passwords are never changed: they're compared exactly as typed
const NEVER_CLEANED = new Set(['password', 'currentPassword', 'newPassword']);

const cleanDeep = (value, key) => {
  if (typeof value === 'string') return NEVER_CLEANED.has(key) ? value : cleanText(value);
  if (Array.isArray(value)) return value.map((v) => cleanDeep(v));
  if (value && typeof value === 'object') {
    for (const k of Object.keys(value)) value[k] = cleanDeep(value[k], k);
  }
  return value;
};

// Express middleware: clean every text value in the request body. Runs for
// JSON bodies in index.js, and for upload forms in verifyUploads (multer
// reads those later than index.js's middleware).
const cleanRequestBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') cleanDeep(req.body);
  next();
};

module.exports = { cleanText, cleanLine, cleanParagraph, cleanDeep, cleanRequestBody, LIMITS };
