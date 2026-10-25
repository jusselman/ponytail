const db = require('../config/db');

// ── Artist identity ──
// Who may use which name, and which account an artist's money belongs to.
// Name matching always goes through the database function ponytail_name_key()
// (migration 019) so "Radiohead", "radi0head" and "Rаdiohead" (Cyrillic а)
// are the same name everywhere.
//
// Rules:
//   - Artist accounts: name must not match a catalog artist (those are reserved
//     and only taken through an approved claim) or another artist account.
//   - Listener accounts: name must not match an artist account. Catalog names
//     are not blocked for listeners, since common names ("Bob", "Sam") are in
//     the catalog; listeners never get an artist badge or artist money.
//   - Verified artists cannot change their name (it is locked to the claim).
//   - Money for a catalog artist goes only to the verified account for that
//     artist, never to an account because its name matches.

const effectiveName = (displayName, username) => {
  const d = typeof displayName === 'string' ? displayName.trim() : '';
  return d || username || '';
};

const nameKey = async (name) => {
  const { rows } = await db.query('SELECT ponytail_name_key($1) AS key', [name]);
  return rows[0].key;
};

// A key plus its "the" variants, so @thestrokes matches "The Strokes" (key
// "strokes") and "The Band" matches a catalog "Theband". The key itself only
// drops "The " when a space follows, so "Theory" is never shortened to "ory".
const keyVariants = (key) => {
  const bare = key.startsWith('the') && key.length > 3 ? key.slice(3) : key;
  return [...new Set([key, bare, `the${bare}`])];
};

const catalogArtistFor = async (key) => {
  const { rows } = await db.query(
    `SELECT artist FROM seed_tracks
     WHERE is_user_upload IS NOT TRUE AND ponytail_name_key(artist) = ANY($1::text[])
     ORDER BY ponytail_name_key(artist) = $2 DESC
     LIMIT 1`,
    [keyVariants(key), key]
  );
  return rows[0]?.artist || null;
};

const artistAccountFor = async (key, excludeUserId = null) => {
  const { rows } = await db.query(
    `SELECT id, username, artist_verified FROM users
     WHERE is_artist = TRUE
       AND ponytail_name_key(COALESCE(NULLIF(trim(display_name), ''), username)) = ANY($1::text[])
       AND ($2::uuid IS NULL OR id <> $2::uuid)
     LIMIT 1`,
    [keyVariants(key), excludeUserId]
  );
  return rows[0] || null;
};

// The verified account for a catalog artist name, or null
const verifiedAccountForArtist = async (artistName) => {
  const { rows } = await db.query(
    `SELECT id, username, display_name, profile_picture, is_artist, artist_verified
     FROM users
     WHERE artist_verified = TRUE
       AND ponytail_name_key(COALESCE(NULLIF(trim(display_name), ''), username)) = ponytail_name_key($1)
     LIMIT 1`,
    [artistName]
  );
  return rows[0] || null;
};

class NameError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

// Throws a NameError if `name` can't be used. Returns the name's key.
// opts: { isArtist, userId (when renaming an existing account) }
const assertNameAvailable = async (name, { isArtist, userId = null } = {}) => {
  const key = await nameKey(name);
  if (!key) throw new NameError(400, 'NAME_INVALID', 'Your name needs at least one letter or number.');

  if (isArtist) {
    const catalogName = await catalogArtistFor(key);
    if (catalogName) {
      throw new NameError(409, 'NAME_RESERVED',
        `"${catalogName}" is already an artist in the Ponytail catalog. If that's you, sign up under another name for now, then find ${catalogName} in Search and tap "Claim this artist". Once we confirm it's you, the name and a verified badge are yours.`);
    }
  }

  const holder = await artistAccountFor(key, userId);
  if (holder) {
    throw new NameError(409, 'NAME_TAKEN', 'An artist on Ponytail already uses that name. Please pick another.');
  }
  return key;
};

// Express helper: send a NameError as JSON, return true if handled
const sendNameError = (res, err) => {
  if (!(err instanceof NameError)) return false;
  res.status(err.status).json({ error: err.message, code: err.code });
  return true;
};

module.exports = {
  effectiveName,
  nameKey,
  catalogArtistFor,
  artistAccountFor,
  verifiedAccountForArtist,
  assertNameAvailable,
  sendNameError,
  NameError,
};
