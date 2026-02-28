const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcrypt');
const db = require('./db');

// Local Strategy - email & password
passport.use(new LocalStrategy(
  { usernameField: 'email' },
  async (email, password, done) => {
    try {
      const result = await db.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      const user = result.rows[0];

      if (!user) {
        return done(null, false, { message: 'No account found with that email.' });
      }

      const passwordMatch = await bcrypt.compare(password, user.password_hash);

      if (!passwordMatch) {
        return done(null, false, { message: 'Incorrect password.' });
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

// Google Strategy
passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;
      const displayName = profile.displayName;
      const avatar = profile.photos[0]?.value;

      // Check if user already exists
      let result = await db.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      let user = result.rows[0];

      // If not, create them
      if (!user) {
        const newUser = await db.query(
          `INSERT INTO users (email, username, display_name, avatar_url)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [email, email.split('@')[0], displayName, avatar]
        );
        user = newUser.rows[0];
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

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