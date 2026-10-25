const db = require('../config/db');
const { verifiedAccountForArtist } = require('../services/artistIdentity');

// ── Tips: a listener sends money to whoever made a track, playlist or Bulletin
// post. Payments are mocked for the demo (see migrations/018_tips.sql and
// frontend/src/services/paymentService.js). The recipient is always worked out
// here on the server from the target, never trusted from the client. ──

const MIN_CENTS = 100;      // $1
const MAX_CENTS = 50000;    // $500
const MAX_MESSAGE = 200;

// Stripe's standard US card pricing, 2.9% + 30c. Shown to the tipper so they
// can see what the artist actually gets.
const feeFor = (cents) => Math.round(cents * 0.029) + 30;

const MOCK_REF = /^pi_mock_[A-Za-z0-9]{8,40}$/;
const CARD_BRANDS = ['visa', 'mastercard', 'amex', 'discover', 'unknown'];

const nameOf = (u) => u.display_name || u.username;

class TipError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const findUser = async (id) => {
  const { rows } = await db.query(
    `SELECT id, username, display_name, profile_picture, is_artist FROM users WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
};

// Catalog artists are paid only through an account the Ponytail team has
// verified (see migration 019 and scripts/reviewClaims.js). A name match alone
// is never enough: anyone can type a name.

// Works out who a tip goes to and what prompted it.
// Returns { recipient (user row or null if held), recipientName, target, label }
const resolveTarget = async (type, raw = {}) => {
  if (type === 'track') {
    const title = String(raw.title || '').trim();
    const artist = String(raw.artist || '').trim();
    if (!title || !artist) throw new TipError(400, 'Which track is this tip for?');
    const { rows } = await db.query(
      `SELECT title, artist, album, uploader_user_id FROM seed_tracks WHERE title = $1 AND artist = $2 LIMIT 1`,
      [title, artist]
    );
    const track = rows[0];
    if (!track) throw new TipError(404, "We couldn't find that track.");
    const recipient = track.uploader_user_id
      ? await findUser(track.uploader_user_id)
      : await verifiedAccountForArtist(track.artist);
    return {
      recipient,
      recipientName: recipient ? nameOf(recipient) : track.artist,
      target: { title: track.title, artist: track.artist, album: track.album || null },
      label: track.title,
    };
  }

  if (type === 'playlist') {
    const playlistId = String(raw.playlistId || '').trim();
    if (!playlistId) throw new TipError(400, 'Which playlist is this tip for?');
    const { rows } = await db.query(
      `SELECT id, title, user_id, is_public FROM playlists WHERE id::text = $1`,
      [playlistId]
    );
    const playlist = rows[0];
    if (!playlist || !playlist.is_public) throw new TipError(404, "We couldn't find that playlist.");
    const recipient = await findUser(playlist.user_id);
    if (!recipient) throw new TipError(404, "That playlist's owner isn't on Ponytail anymore.");
    return {
      recipient,
      recipientName: nameOf(recipient),
      target: { playlistId: playlist.id, title: playlist.title },
      label: playlist.title,
    };
  }

  if (type === 'post') {
    const postId = String(raw.postId || '').trim();
    if (!postId) throw new TipError(400, 'Which post is this tip for?');
    const { rows } = await db.query(
      `SELECT id, body, author_id FROM bulletin_posts WHERE id::text = $1`,
      [postId]
    );
    const post = rows[0];
    if (!post) throw new TipError(404, "We couldn't find that post.");
    if (!post.author_id) throw new TipError(400, "Demo posts can't receive tips.");
    const recipient = await findUser(post.author_id);
    const excerpt = post.body.length > 60 ? `${post.body.slice(0, 57).trimEnd()}...` : post.body;
    return {
      recipient,
      recipientName: nameOf(recipient),
      target: { postId: post.id, excerpt },
      label: excerpt,
    };
  }

  throw new TipError(400, 'Tips can go to tracks, playlists or posts.');
};

const sendError = (res, err, fallback) => {
  if (err instanceof TipError) return res.status(err.status).json({ error: err.message });
  console.error(fallback, err);
  return res.status(500).json({ error: fallback });
};

// GET /api/tips/recipient?type=track&title=...&artist=... (or playlistId / postId)
// Who a tip would go to, so the Tip panel can show it before paying.
const getRecipient = async (req, res) => {
  try {
    const { type, ...raw } = req.query;
    const { recipient, recipientName, label } = await resolveTarget(type, raw);
    res.json({
      name: recipientName,
      username: recipient?.username || null,
      avatarUrl: recipient?.profile_picture || null,
      isArtist: recipient ? !!recipient.is_artist : true,
      onPonytail: !!recipient,
      isYou: recipient?.id === req.user.id,
      label,
    });
  } catch (err) {
    sendError(res, err, 'Could not look up who gets this tip.');
  }
};

// POST /api/tips
// { targetType, target, amountCents, message, anonymous, payment: { ref, brand, last4 } }
const createTip = async (req, res) => {
  try {
    const { targetType, target, message, anonymous, payment } = req.body || {};
    const amountCents = Number(req.body?.amountCents);

    if (!Number.isInteger(amountCents) || amountCents < MIN_CENTS || amountCents > MAX_CENTS) {
      return res.status(400).json({ error: 'Tips can be from $1 to $500.' });
    }
    if (!payment || !MOCK_REF.test(String(payment.ref || ''))) {
      return res.status(400).json({ error: 'That payment did not go through.' });
    }
    const note = typeof message === 'string' ? message.trim().slice(0, MAX_MESSAGE) : '';
    const brand = CARD_BRANDS.includes(payment.brand) ? payment.brand : 'unknown';
    const last4 = /^[0-9]{4}$/.test(String(payment.last4 || '')) ? String(payment.last4) : null;

    const resolved = await resolveTarget(targetType, target);
    if (resolved.recipient?.id === req.user.id) {
      return res.status(400).json({ error: "You can't tip yourself." });
    }

    const { rows } = await db.query(
      `INSERT INTO tips
         (tipper_id, recipient_id, recipient_name, target_type, target, target_label,
          amount_cents, fee_cents, message, is_anonymous,
          payment_provider, payment_ref, payment_status, card_brand, card_last4, recipient_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'mock', $11, 'succeeded', $12, $13,
               ponytail_name_key($3))
       RETURNING id, amount_cents, fee_cents, created_at`,
      [
        req.user.id, resolved.recipient?.id || null, resolved.recipientName,
        targetType, JSON.stringify(resolved.target), resolved.label,
        amountCents, feeFor(amountCents), note || null, !!anonymous,
        payment.ref, brand, last4,
      ]
    );
    const tip = rows[0];
    res.status(201).json({
      tip: {
        id: tip.id,
        amountCents: tip.amount_cents,
        feeCents: tip.fee_cents,
        recipientName: resolved.recipientName,
        onPonytail: !!resolved.recipient,
        createdAt: tip.created_at,
      },
    });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'That payment was already used for a tip.' });
    sendError(res, err, 'Could not send that tip.');
  }
};

// GET /api/tips/received — the signed-in user's tips. Private: only ever
// returns tips sent to the person asking. Anonymous tippers come back as null.
const getReceivedTips = async (req, res) => {
  try {
    const me = await findUser(req.user.id);
    if (!me) return res.status(404).json({ error: 'Account not found.' });

    // Held tips are NOT picked up here by name. They move to an account only
    // when the team approves that account's claim (scripts/reviewClaims.js).

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const [list, totals] = await Promise.all([
      db.query(
        `SELECT t.id, t.amount_cents, t.fee_cents, t.message, t.is_anonymous, t.created_at,
                t.target_type, t.target, t.target_label,
                u.username, u.display_name, u.profile_picture
         FROM tips t
         LEFT JOIN users u ON u.id = t.tipper_id
         WHERE t.recipient_id = $1 AND t.payment_status = 'succeeded'
         ORDER BY t.created_at DESC
         LIMIT $2`,
        [me.id, limit]
      ),
      db.query(
        `SELECT COUNT(*)::int AS count,
                COALESCE(SUM(amount_cents), 0)::int AS total,
                COALESCE(SUM(amount_cents - fee_cents), 0)::int AS net,
                COUNT(DISTINCT tipper_id) FILTER (WHERE NOT is_anonymous)::int AS named_supporters,
                COUNT(*) FILTER (WHERE is_anonymous)::int AS anonymous_tips
         FROM tips WHERE recipient_id = $1 AND payment_status = 'succeeded'`,
        [me.id]
      ),
    ]);

    const t = totals.rows[0];
    res.json({
      count: t.count,
      totalCents: t.total,
      netCents: t.net,
      tips: list.rows.map((row) => ({
        id: row.id,
        amountCents: row.amount_cents,
        feeCents: row.fee_cents,
        message: row.message,
        createdAt: row.created_at,
        targetType: row.target_type,
        target: row.target,
        targetLabel: row.target_label,
        anonymous: row.is_anonymous,
        tipper: row.is_anonymous || !row.username ? null : {
          username: row.username,
          name: row.display_name || row.username,
          avatarUrl: row.profile_picture || null,
        },
      })),
    });
  } catch (err) {
    sendError(res, err, 'Could not load your tips.');
  }
};

module.exports = { getRecipient, createTip, getReceivedTips, feeFor };
