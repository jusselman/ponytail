// Emails are compared ignoring capitals and stray spaces: "Josh@Gmail.com " and
// "josh@gmail.com" are the same address (SECURITY_RISKS.md SR-33). Every place
// that stores or looks up an email goes through this, and the database keeps a
// unique index on lower(email) as a backstop (migration 020).
const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

module.exports = { normalizeEmail };
