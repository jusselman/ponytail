const db = require('../config/db');
const { assertNameAvailable, nameKey, NameError } = require('./artistIdentity');

// ── Usernames (@handles) ──
// People choose their own at signup (SECURITY_RISKS.md SR-35); before, they were
// built from the email address, which published half of everyone's email.
// The same rules run for the live check while typing and again at signup.
//
//   - 3 to 30 characters: lower-case letters, digits, "." and "_"
//   - starts and ends with a letter or digit, no ".."
//   - not one of Ponytail's own words (admin, support, ...), look-alikes included
//   - not taken, ignoring capitals (SR-42)
//   - not the name of an artist in the catalog or on Ponytail, look-alikes
//     included (SR-04), so nobody can be @radiohead or @radi0head

const FORMAT = /^[a-z0-9](?:[a-z0-9._]{1,28})[a-z0-9]$/;

const RESERVED = [
  'admin', 'administrator', 'ponytail', 'ponytailteam', 'support', 'help', 'root', 'system',
  'moderator', 'mod', 'staff', 'official', 'security', 'team', 'verified', 'api', 'settings',
  'about', 'login', 'signup', 'search', 'bulletin', 'radio', 'home', 'me', 'null', 'undefined',
];

let reservedKeys = null;
const getReservedKeys = async () => {
  if (!reservedKeys) {
    const { rows } = await db.query('SELECT ponytail_name_key(w) AS k FROM unnest($1::text[]) AS w', [RESERVED]);
    reservedKeys = new Set(rows.map((r) => r.k));
  }
  return reservedKeys;
};

const normalizeUsername = (raw) => String(raw || '').trim().replace(/^@+/, '').toLowerCase();

// Throws a NameError (code USERNAME_INVALID / USERNAME_RESERVED / USERNAME_TAKEN /
// USERNAME_ARTIST) if the username can't be used. Returns it normalized.
// excludeUserId: the account itself, when changing an existing username.
const assertUsernameAvailable = async (raw, { excludeUserId = null } = {}) => {
  const username = normalizeUsername(raw);

  if (username.length < 3 || username.length > 30) {
    throw new NameError(400, 'USERNAME_INVALID', 'Usernames need 3 to 30 characters.');
  }
  if (!FORMAT.test(username) || username.includes('..')) {
    throw new NameError(400, 'USERNAME_INVALID', 'Use letters, numbers, dots and underscores, starting and ending with a letter or number.');
  }

  const key = await nameKey(username);
  if ((await getReservedKeys()).has(key)) {
    throw new NameError(409, 'USERNAME_RESERVED', 'That username is reserved. Please choose another.');
  }

  const { rows } = await db.query(
    'SELECT 1 FROM users WHERE lower(username) = $1 AND ($2::uuid IS NULL OR id <> $2::uuid) LIMIT 1',
    [username, excludeUserId]
  );
  if (rows.length) throw new NameError(409, 'USERNAME_TAKEN', 'That username is already taken.');

  try {
    await assertNameAvailable(username, { isArtist: true, userId: excludeUserId });
  } catch (err) {
    if (!(err instanceof NameError)) throw err;
    throw new NameError(409, 'USERNAME_ARTIST', 'That username matches an artist on Ponytail. Please choose another.');
  }

  return username;
};

module.exports = { assertUsernameAvailable, normalizeUsername };
