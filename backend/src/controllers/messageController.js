const db = require('../config/db');

// ── Direct messages ──────────────────────────────────────────────────────────
// Anyone can DM anyone. Conversations are one-per-pair (see
// migrations/009_direct_messages.sql). Delivery is plain REST + client polling:
// the open thread asks for messages `after` the newest one it already has, and
// the header badge polls /unread-count.

const MAX_BODY_LENGTH = 2000;
const PAGE_SIZE = 50;

// Shape one messages row for the client. `mine` saves every caller from
// comparing sender ids themselves.
const mapMessage = (row, userId) => ({
  id: row.id,
  conversationId: row.conversation_id,
  senderId: row.sender_id,
  mine: row.sender_id === userId,
  body: row.body,
  attachmentType: row.attachment_type,
  attachment: row.attachment,
  createdAt: row.created_at,
  readAt: row.read_at,
});

const mapOtherUser = (row) => ({
  id: row.other_id,
  username: row.other_username,
  displayName: row.other_display_name || row.other_username,
  profilePicture: row.other_profile_picture,
  isArtist: row.other_is_artist,
});

// ── Confirm the requesting user is one of the two people in a conversation ──
const getParticipantConversation = async (conversationId, userId) => {
  const result = await db.query(
    `SELECT c.id, c.user_a_id, c.user_b_id,
            u.id AS other_id, u.username AS other_username,
            u.display_name AS other_display_name,
            u.profile_picture AS other_profile_picture,
            u.is_artist AS other_is_artist
     FROM conversations c
     JOIN users u ON u.id = CASE WHEN c.user_a_id = $2 THEN c.user_b_id ELSE c.user_a_id END
     WHERE c.id = $1 AND (c.user_a_id = $2 OR c.user_b_id = $2)`,
    [conversationId, userId]
  );
  return result.rows[0] || null;
};

// ── Validate + normalize an optional attachment from the request body. Returns
// { type, data } or null; throws a string message on bad input. ──
const normalizeAttachment = async (attachment, userId) => {
  if (!attachment) return null;
  const { type } = attachment;

  if (type === 'track') {
    const t = attachment.track || {};
    if (!t.title || !t.artist) throw 'A shared track needs a title and artist.';
    return {
      type: 'track',
      data: {
        title: String(t.title),
        artist: String(t.artist),
        album: t.album || null,
        genre: t.genre || null,
        coverUrl: t.coverUrl || null,
        audioUrl: t.audioUrl || null,
      },
    };
  }

  if (type === 'playlist') {
    const playlistId = attachment.playlistId;
    if (!playlistId) throw 'A shared playlist needs an id.';
    // Only public playlists (or your own) can be shared — the recipient opens it
    // through the read-only viewer, which refuses private playlists anyway.
    const result = await db.query(
      `SELECT p.id, p.title, p.cover_art_url, p.is_public, p.user_id, u.username,
              (SELECT COUNT(*)::int FROM playlist_tracks pt WHERE pt.playlist_id = p.id) AS track_count
       FROM playlists p JOIN users u ON u.id = p.user_id
       WHERE p.id = $1`,
      [playlistId]
    );
    const p = result.rows[0];
    if (!p) throw 'Playlist not found.';
    if (!p.is_public) throw 'Only public playlists can be shared.';
    return {
      type: 'playlist',
      data: {
        id: p.id,
        title: p.title,
        coverUrl: p.cover_art_url,
        trackCount: p.track_count,
        ownerUsername: p.username,
      },
    };
  }

  throw 'Unknown attachment type.';
};

// GET /api/messages/conversations — inbox, most recent activity first, with the
// other person, a preview of the last message, and an unread count per thread.
// Conversations with no messages yet (opened but never sent) are hidden.
const getConversations = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await db.query(
      `SELECT c.id, c.last_message_at,
              u.id AS other_id, u.username AS other_username,
              u.display_name AS other_display_name,
              u.profile_picture AS other_profile_picture,
              u.is_artist AS other_is_artist,
              lm.id AS last_id, lm.sender_id AS last_sender_id, lm.body AS last_body,
              lm.attachment_type AS last_attachment_type, lm.attachment AS last_attachment,
              lm.created_at AS last_created_at,
              (SELECT COUNT(*)::int FROM messages m
                WHERE m.conversation_id = c.id AND m.sender_id <> $1 AND m.read_at IS NULL) AS unread_count
       FROM conversations c
       JOIN users u ON u.id = CASE WHEN c.user_a_id = $1 THEN c.user_b_id ELSE c.user_a_id END
       JOIN LATERAL (
         SELECT * FROM messages m
         WHERE m.conversation_id = c.id
         ORDER BY m.created_at DESC
         LIMIT 1
       ) lm ON true
       WHERE c.user_a_id = $1 OR c.user_b_id = $1
       ORDER BY c.last_message_at DESC`,
      [userId]
    );

    res.json({
      conversations: result.rows.map(row => ({
        id: row.id,
        otherUser: mapOtherUser(row),
        lastMessage: {
          id: row.last_id,
          mine: row.last_sender_id === userId,
          body: row.last_body,
          attachmentType: row.last_attachment_type,
          attachment: row.last_attachment,
          createdAt: row.last_created_at,
        },
        unreadCount: row.unread_count,
      })),
    });
  } catch (err) {
    console.error('Get conversations error:', err);
    res.status(500).json({ error: 'Failed to fetch conversations.' });
  }
};

// GET /api/messages/unread-count — total unread across all threads, for the
// header badge. Cheap enough to poll.
const getUnreadCount = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT COUNT(*)::int AS count
       FROM messages m
       JOIN conversations c ON c.id = m.conversation_id
       WHERE (c.user_a_id = $1 OR c.user_b_id = $1)
         AND m.sender_id <> $1 AND m.read_at IS NULL`,
      [req.user.id]
    );
    res.json({ count: result.rows[0].count });
  } catch (err) {
    console.error('Get unread count error:', err);
    res.status(500).json({ error: 'Failed to fetch unread count.' });
  }
};

// POST /api/messages/conversations { username } — get or create the conversation
// with that user. Used by the "Message" button on a profile.
const openConversation = async (req, res) => {
  const { username } = req.body || {};
  if (!username) return res.status(400).json({ error: 'Username is required.' });

  try {
    const target = await db.query('SELECT id FROM users WHERE username = $1', [username]);
    if (target.rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    const targetId = target.rows[0].id;

    if (targetId === req.user.id) {
      return res.status(400).json({ error: "You can't message yourself." });
    }

    // LEAST/GREATEST keep the pair in canonical order so the UNIQUE constraint
    // catches a simultaneous create from the other side.
    const upsert = await db.query(
      `INSERT INTO conversations (user_a_id, user_b_id)
       VALUES (LEAST($1::uuid, $2::uuid), GREATEST($1::uuid, $2::uuid))
       ON CONFLICT (user_a_id, user_b_id) DO UPDATE SET user_a_id = conversations.user_a_id
       RETURNING id`,
      [req.user.id, targetId]
    );

    const convo = await getParticipantConversation(upsert.rows[0].id, req.user.id);
    res.json({ conversation: { id: convo.id, otherUser: mapOtherUser(convo) } });
  } catch (err) {
    console.error('Open conversation error:', err);
    res.status(500).json({ error: 'Failed to open conversation.' });
  }
};

// GET /api/messages/conversations/:id/messages
//   ?after=<ISO timestamp>  → only messages newer than that (polling)
//   ?before=<ISO timestamp> → the page before that (scrollback)
//   neither                 → the latest page
// Always returned oldest → newest.
const getMessages = async (req, res) => {
  const { id } = req.params;
  const { after, before } = req.query;

  try {
    const convo = await getParticipantConversation(id, req.user.id);
    if (!convo) return res.status(404).json({ error: 'Conversation not found.' });

    let rows;
    if (after) {
      const result = await db.query(
        `SELECT * FROM messages
         WHERE conversation_id = $1 AND created_at > $2
         ORDER BY created_at ASC
         LIMIT 200`,
        [id, after]
      );
      rows = result.rows;
    } else {
      const result = await db.query(
        `SELECT * FROM (
           SELECT * FROM messages
           WHERE conversation_id = $1 ${before ? 'AND created_at < $3' : ''}
           ORDER BY created_at DESC
           LIMIT $2
         ) page ORDER BY created_at ASC`,
        before ? [id, PAGE_SIZE, before] : [id, PAGE_SIZE]
      );
      rows = result.rows;
    }

    // ── The other person's latest read receipt on my messages, so the thread can
    // show "Seen" under my last message ──
    const seen = await db.query(
      `SELECT MAX(read_at) AS last_read_at FROM messages
       WHERE conversation_id = $1 AND sender_id = $2`,
      [id, req.user.id]
    );

    res.json({
      conversation: { id: convo.id, otherUser: mapOtherUser(convo) },
      messages: rows.map(r => mapMessage(r, req.user.id)),
      hasMore: !after && rows.length === PAGE_SIZE,
      otherLastReadAt: seen.rows[0].last_read_at,
    });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Failed to fetch messages.' });
  }
};

// POST /api/messages/conversations/:id/messages { body?, attachment? }
// attachment: { type: 'track', track: {title, artist, album, genre, coverUrl, audioUrl} }
//          or { type: 'playlist', playlistId }
const sendMessage = async (req, res) => {
  const { id } = req.params;
  const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';

  if (body.length > MAX_BODY_LENGTH) {
    return res.status(400).json({ error: `Messages are limited to ${MAX_BODY_LENGTH} characters.` });
  }

  let attachment;
  try {
    attachment = await normalizeAttachment(req.body?.attachment, req.user.id);
  } catch (msg) {
    if (typeof msg === 'string') return res.status(400).json({ error: msg });
    console.error('Attachment validation error:', msg);
    return res.status(500).json({ error: 'Failed to send message.' });
  }

  if (!body && !attachment) {
    return res.status(400).json({ error: 'Message is empty.' });
  }

  try {
    const convo = await getParticipantConversation(id, req.user.id);
    if (!convo) return res.status(404).json({ error: 'Conversation not found.' });

    const result = await db.query(
      `INSERT INTO messages (conversation_id, sender_id, body, attachment_type, attachment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, req.user.id, body || null, attachment?.type || null, attachment ? JSON.stringify(attachment.data) : null]
    );
    const message = result.rows[0];

    await db.query(
      'UPDATE conversations SET last_message_at = $2 WHERE id = $1',
      [id, message.created_at]
    );

    res.status(201).json({ message: mapMessage(message, req.user.id) });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Failed to send message.' });
  }
};

// POST /api/messages/conversations/:id/read — mark everything the other person
// sent in this thread as read.
const markConversationRead = async (req, res) => {
  const { id } = req.params;
  try {
    const convo = await getParticipantConversation(id, req.user.id);
    if (!convo) return res.status(404).json({ error: 'Conversation not found.' });

    const result = await db.query(
      `UPDATE messages SET read_at = NOW()
       WHERE conversation_id = $1 AND sender_id <> $2 AND read_at IS NULL`,
      [id, req.user.id]
    );
    res.json({ success: true, marked: result.rowCount });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ error: 'Failed to mark conversation read.' });
  }
};

module.exports = {
  getConversations,
  getUnreadCount,
  openConversation,
  getMessages,
  sendMessage,
  markConversationRead,
};
