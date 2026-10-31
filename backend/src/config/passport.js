const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
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
      const result = await db.query(
        'SELECT * FROM users WHERE lower(email) = $1',
        [normalizeEmail(email)]
      );

      const user = result.rows[0];
      const passwordMatch = await bcrypt.compare(String(password || ''), user?.password_hash || STAND_IN_HASH);

      if (!user || !user.password_hash || !passwordMatch) {
        return done(null, false, { message: LOGIN_FAILED });
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

// Google Strategy: only set up when GOOGLE_SIGNIN_ENABLED=true. It stays off
// until email verification exists (SECURITY_RISKS.md SR-32, SR-36).
const googleSigninEnabled = process.env.GOOGLE_SIGNIN_ENABLED === 'true';
if (googleSigninEnabled) {
  passport.use(new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = normalizeEmail(profile.emails[0].value);
        const displayName = profile.displayName;
        const avatar = profile.photos[0]?.value;

        // Check if user already exists
        let result = await db.query(
          'SELECT * FROM users WHERE lower(email) = $1',
          [email]
        );

        let user = result.rows[0];

        // If not, create them. A Google name that matches an artist on Ponytail is
        // not used (it would let anyone pose as that artist); the account shows
        // its username instead and the person can pick a name later.
        if (!user) {
          let safeName = displayName;
          try { await assertNameAvailable(displayName, { isArtist: false }); } catch { safeName = null; }
          const newUser = await db.query(
            `INSERT INTO users (email, username, display_name, avatar_url)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [email, email.split('@')[0].toLowerCase(), safeName, avatar]
          );
          user = newUser.rows[0];
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  ));
}

passport.googleSigninEnabled = googleSigninEnabled;

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, result.rows[0]);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;