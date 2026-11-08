// ── Startup check of backend/.env ──
// Stops the server straight away with a plain message when a setting the app
// can't work without is missing, instead of starting up and then failing every
// sign-in with "Something went wrong" (SECURITY_RISKS.md SR-52).
// backend/.env.example lists every setting.
const jwt = require('jsonwebtoken');

module.exports = function checkEnv() {
  const env = process.env;
  const problems = [];
  const missing = (name, why) => problems.push(`${name} is missing (${why})`);

  if (!env.DATABASE_URL) missing('DATABASE_URL', 'the database connection');

  if (!env.JWT_SECRET) missing('JWT_SECRET', 'signs login tokens');
  else if (env.JWT_SECRET.length < 32) problems.push('JWT_SECRET is too short: use at least 32 random characters');

  if (!env.JWT_EXPIRES_IN) missing('JWT_EXPIRES_IN', 'how long a login lasts, e.g. 7d');
  else {
    try { jwt.sign({}, 'check', { expiresIn: env.JWT_EXPIRES_IN }); }
    catch { problems.push(`JWT_EXPIRES_IN "${env.JWT_EXPIRES_IN}" isn't a valid length of time: use something like 7d, 12h or 30m`); }
  }

  if (problems.length) {
    console.error('\nPonytail backend can\'t start. Fix these in backend/.env (see backend/.env.example):\n');
    problems.forEach((p) => console.error(`  - ${p}`));
    console.error('');
    process.exit(1);
  }
};
