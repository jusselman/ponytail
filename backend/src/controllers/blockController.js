const db = require('../config/db');

// ── Blocking ─────────────────────────────────────────────────────────────────
// See migrations/010_user_blocks.sql. A block currently only stops the
// blocked person from messaging the blocker; messageController.js enforces it.

const findUserId = async (username) => {
  const result = await db.query('SELECT id FROM users WHERE username = $1', [username]);
  return result.rows[0]?.id || null;
};

// GET /api/blocks — everyone the current user has blocked, newest first
const getBlockedUsers = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.username, u.display_name, u.profile_picture, u.is_artist, b.created_at
       FROM user_blocks b
       JOIN users u ON u.id = b.blocked_id
       WHERE b.blocker_id = $1
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json({
      users: result.rows.map(row => ({
        id: row.id,
        username: row.username,
        displayName: row.display_name || row.username,
        profilePicture: row.profile_picture,
        isArtist: row.is_artist,
        blockedAt: row.created_at,
      })),
    });
  } catch (err) {
    console.error('Get blocked users error:', err);
    res.status(500).json({ error: 'Failed to fetch blocked users.' });
  }
};

// POST /api/blocks/:username — block someone (idempotent)
const blockUser = async (req, res) => {
  try {
    const targetId = await findUserId(req.params.username);
    if (!targetId) return res.status(404).json({ error: 'User not found.' });
    if (targetId === req.user.id) return res.status(400).json({ error: "You can't block yourself." });

    await db.query(
      `INSERT INTO user_blocks (blocker_id, blocked_id) VALUES ($1, $2)
       ON CONFLICT (blocker_id, blocked_id) DO NOTHING`,
      [req.user.id, targetId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Block user error:', err);
    res.status(500).json({ error: 'Failed to block user.' });
  }
};

// DELETE /api/blocks/:username — unblock someone (idempotent)
const unblockUser = async (req, res) => {
  try {
    const targetId = await findUserId(req.params.username);
    if (!targetId) return res.status(404).json({ error: 'User not found.' });

    await db.query(
      'DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2',
      [req.user.id, targetId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Unblock user error:', err);
    res.status(500).json({ error: 'Failed to unblock user.' });
  }
};

module.exports = { getBlockedUsers, blockUser, unblockUser };
