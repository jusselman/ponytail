const crypto = require('crypto');
const db = require('../config/db');
const { nameKey, catalogArtistFor } = require('../services/artistIdentity');

// ── Artist claims: "this catalog artist is me" ──
// An artist account asks to be recognised as an artist in the catalog. The
// app gives them a one-off code to post somewhere only the real artist can
// (their Bandcamp/Instagram bio, website), and the Ponytail team checks it with
// scripts/reviewClaims.js. Nothing here can approve a claim: there is no API
// for that, on purpose. See migration 019.

const MAX_PENDING = 3;
const MAX_EVIDENCE = 1000;

const shape = (row) => ({
  id: row.id,
  artistName: row.artist_name,
  status: row.status,
  source: row.source,
  verificationCode: row.verification_code,
  reviewerNote: row.status === 'pending' ? null : row.reviewer_note,
  createdAt: row.created_at,
  reviewedAt: row.reviewed_at,
});

// POST /api/claims  { artistName, evidence }
const createClaim = async (req, res) => {
  try {
    const { rows: [me] } = await db.query(
      'SELECT id, is_artist, artist_verified FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!me) return res.status(404).json({ error: 'Account not found.' });
    if (!me.is_artist) return res.status(403).json({ error: 'Only artist accounts can claim an artist profile.' });
    if (me.artist_verified) return res.status(400).json({ error: 'Your account is already verified as an artist.' });

    const artistInput = String(req.body?.artistName || '').trim().slice(0, 200);
    const evidence = String(req.body?.evidence || '').trim().slice(0, MAX_EVIDENCE);
    if (!artistInput) return res.status(400).json({ error: 'Which artist are you?' });
    if (evidence.length < 10) {
      return res.status(400).json({ error: 'Tell us where we can check it is you, for example a link to your Bandcamp, Instagram or website.' });
    }

    const inputKey = await nameKey(artistInput);
    const artistName = inputKey ? await catalogArtistFor(inputKey) : null;
    if (!artistName) {
      return res.status(404).json({ error: "That artist isn't in the Ponytail catalog. You can upload your music under your own name instead." });
    }
    // Store the catalog artist's own key (what tips are held under), not the
    // key of whatever spelling was typed
    const key = await nameKey(artistName);

    const { rows: [taken] } = await db.query(
      `SELECT 1 FROM claim_requests WHERE artist_key = $1 AND status = 'approved'`, [key]
    );
    if (taken) return res.status(409).json({ error: 'That artist has already been verified on Ponytail. If you think this is wrong, contact the Ponytail team.' });

    const { rows: [{ count }] } = await db.query(
      `SELECT COUNT(*)::int AS count FROM claim_requests WHERE user_id = $1 AND status = 'pending'`, [me.id]
    );
    if (count >= MAX_PENDING) return res.status(429).json({ error: 'You already have claims waiting for review.' });

    const code = `ponytail-${crypto.randomBytes(4).toString('hex')}`;
    const { rows: [claim] } = await db.query(
      `INSERT INTO claim_requests (user_id, artist_name, artist_key, evidence, verification_code)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [me.id, artistName, key, evidence, code]
    );
    res.status(201).json({ claim: shape(claim) });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'You already have a claim waiting for review for that artist.' });
    console.error('Create claim error:', err);
    res.status(500).json({ error: 'Could not send your claim.' });
  }
};

// GET /api/claims/mine
const getMyClaims = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM claim_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [req.user.id]
    );
    res.json({ claims: rows.map(shape) });
  } catch (err) {
    console.error('Get claims error:', err);
    res.status(500).json({ error: 'Could not load your claims.' });
  }
};

module.exports = { createClaim, getMyClaims };
