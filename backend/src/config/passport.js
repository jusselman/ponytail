const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const db = require('./db');
const { assertNameAvailable } = require('../services/artistIdentity');
const { normalizeEmail } = require('../utils/email');

// Local Strategy - email & password
//
// Every failed sign-in looks the same from outside, so nobody can use the login
// form to find out which emails have accounts (SECURITY_RISKS.md SR-10, SR-31,
// SR-34):
//   - one message for an unknown email, a wrong password, and an account made
//     with Google that has no password
//   - the password check always runs, against a stand-in hash when there's no
//     real one, so an unknown email takes as long as a real one
const LOGIN_FAILED = 'Email or password is incorrect.';
const STAND_IN_HASH = bcrypt.hashSync('ponytail-no-account-stand-in', 12);

passport.use(new LocalStrategy(
  { usernameField: 'email' },
  async (email, password, done) => {
    try {
      // Only the columns sign-in needs (SECURITY_RISKS.md SR-13)
      const result = await db.query(
        `SELECT id, email, username, display_name, is_artist, artist_verified, password_hash
         FROM users WHERE lower(email) = $1`,
        [normalizeEmail(email)]
      );

      const row = result.rows[0];
      const passwordMatch = await bcrypt.compare(String(password || ''), row?.password_hash || STAND_IN_HASH);

      if (!row || !row.password_hash || !passwordMatch) {
        return done(null, false, { message: LOGIN_FAILED });
      }

      // The hash is only for the check above; the signed-in user never carries it
      const { password_hash, ...user } = row;
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

// Google sign-in was removed (SECURITY_RISKS.md SR-32). Sign-in is email and
// password only, using login tokens; there are no server sessions, so Passport
// needs no serializeUser/deserializeUser.

module.exports = passport;