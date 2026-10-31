const { rateLimit } = require('express-rate-limit');

// ── Rate limits ──
// Caps on how often one person (or one network address) can do something, so
// nobody can guess passwords endlessly, create accounts in bulk, or flood the
// server with uploads, posts and messages. See SECURITY_RISKS.md (SR-09).
//
// Counters live in server memory: restarting the backend resets them, which is
// also the quick fix if the team locks itself out while testing. Before running
// more than one server, move them to a shared store (Redis).
//
// Signed-in routes count per account (the limiter goes after requireAuth);
// signed-out routes count per network address. Login also counts per email, so
// spreading guesses across many addresses doesn't help.

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

// "15 minutes", "an hour", ... until the limit resets
const waitText = (resetTime) => {
  const mins = Math.max(1, Math.ceil(((resetTime?.getTime?.() || Date.now() + MINUTE) - Date.now()) / MINUTE));
  if (mins >= 60) return mins >= 120 ? `${Math.round(mins / 60)} hours` : 'an hour';
  return mins === 1 ? 'a minute' : `${mins} minutes`;
};

const make = ({ windowMs, limit, message, byAccount = false, keyGenerator, skipSuccessfulRequests = false }) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',   // RateLimit headers so the app could show a countdown
    legacyHeaders: false,
    skipSuccessfulRequests,
    keyGenerator: keyGenerator || (byAccount ? (req) => (req.user?.id ? `user:${req.user.id}` : req.ip) : undefined),
    handler: (req, res, next, options) => {
      res.status(options.statusCode).json({
        error: `${message} Please try again in ${waitText(req.rateLimit?.resetTime)}.`,
        code: 'RATE_LIMITED',
      });
    },
  });

// Everything under /api: a flood guard, far above normal use
const general = make({ windowMs: MINUTE, limit: 600, message: 'Too many requests.' });

// Signing in. Only failed attempts count.
// - per address: one machine guessing at many accounts
// - per email + address: one machine guessing at one account
// - per email, across all addresses: guesses spread over many machines. Set
//   well above the one above, so a stranger can't lock a real person out of
//   their own account just by typing wrong passwords for their email.
const emailOf = (req) => String(req.body?.email || '').trim().toLowerCase();
const loginByAddress = make({
  windowMs: 15 * MINUTE, limit: 20, skipSuccessfulRequests: true,
  message: 'Too many sign-in attempts.',
});
const loginByEmailAndAddress = make({
  windowMs: 15 * MINUTE, limit: 8, skipSuccessfulRequests: true,
  message: 'Too many sign-in attempts for this account.',
  keyGenerator: (req) => (emailOf(req) ? `email:${emailOf(req)}|${req.ip}` : req.ip),
});
const loginByEmail = make({
  windowMs: 15 * MINUTE, limit: 50, skipSuccessfulRequests: true,
  message: 'Too many sign-in attempts for this account.',
  keyGenerator: (req) => (emailOf(req) ? `email:${emailOf(req)}` : req.ip),
});

const signup = make({ windowMs: HOUR, limit: 20, message: 'Too many new accounts from this network.' });
const nameCheck = make({ windowMs: 10 * MINUTE, limit: 60, message: 'Too many name checks.' });
const changePassword = make({ windowMs: 15 * MINUTE, limit: 10, byAccount: true, message: 'Too many password attempts.' });
const claims = make({ windowMs: HOUR, limit: 10, byAccount: true, message: "You've sent a lot of claims." });
const uploads = make({ windowMs: HOUR, limit: 60, byAccount: true, message: "You've uploaded a lot in the last hour." });
const tips = make({ windowMs: HOUR, limit: 60, byAccount: true, message: "You've sent a lot of tips in the last hour." });
const posting = make({ windowMs: 10 * MINUTE, limit: 30, byAccount: true, message: "You're posting very quickly." });
const messaging = make({ windowMs: MINUTE, limit: 30, byAccount: true, message: "You're sending messages very quickly." });

module.exports = {
  general, loginByAddress, loginByEmailAndAddress, loginByEmail, signup, nameCheck, changePassword,
  claims, uploads, tips, posting, messaging,
};
