const path = require('path');
const { uploadPathFromUrl } = require('../utils/uploads');
const fs = require('fs');
const db = require('../config/db');

// ── Bulletin: the community feed. Anyone can post, like and reply; which tags
// a post may carry depends on whether the author is a musician or a listener
// (see migrations/017_bulletin.sql for the tables). Keep these lists in sync
// with frontend/src/constants/bulletinTags.js. ──

const MUSICIAN_TAGS = ['New Release', 'Show', 'Crowdfunding', 'Milestone', 'Looking For'];
const LISTENER_TAGS = ['Recommendation', 'Show Recap', 'Discussion', 'Question'];
const SHARED_TAGS = ['General'];

const MAX_BODY_LENGTH = 1000;
const MAX_REPLY_LENGTH = 500;
const MAX_FIELD_LENGTH = 120;
const PAGE_SIZE = 20;

const uploadDir = path.join(__dirname, '../../assets/uploads');

const allowedTagsFor = (isArtist) => (
  isArtist ? [...MUSICIAN_TAGS, ...SHARED_TAGS] : [...LISTENER_TAGS, ...SHARED_TAGS]
);

// ── Tag-specific fields. Each tag lists the detail keys it accepts; anything
// else sent is dropped. `required` keys must be present. ──
const TAG_FIELDS = {
  'Show': { keys: ['date', 'venue', 'city', 'ticketUrl'], required: ['date', 'venue'] },
  'Crowdfunding': { keys: ['goal', 'raised', 'link', 'endDate'], required: ['goal'] },
  'Looking For': { keys: ['role', 'location'], required: ['role'] },
  'New Release': { keys: ['releaseDate'], required: [] },
  'Show Recap': { keys: ['artist', 'venue'], required: [] },
};

const FIELD_LABELS = {
  date: 'a show date', venue: 'a venue', goal: 'a funding goal', role: 'what you are looking for',
};

const DATE_KEYS = ['date', 'endDate', 'releaseDate'];
const URL_KEYS = ['ticketUrl', 'link'];
const MONEY_KEYS = ['goal', 'raised'];

const normalizeUrl = (value) => {
  const v = value.trim();
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withScheme);
    if (!u.hostname.includes('.')) throw new Error();
    return u.toString();
  } catch {
    throw `That link doesn't look right: ${v}`;
  }
};

// Returns a cleaned details object (or null); throws a string on bad input.
const normalizeDetails = (tag, raw) => {
  const spec = TAG_FIELDS[tag];
  if (!spec) return null;
  const input = raw && typeof raw === 'object' ? raw : {};
  const out = {};

  for (const key of spec.keys) {
    let value = input[key];
    if (value === undefined || value === null) continue;
    value = String(value).trim();
    if (!value) continue;
    if (value.length > MAX_FIELD_LENGTH && !URL_KEYS.includes(key)) value = value.slice(0, MAX_FIELD_LENGTH);

    if (DATE_KEYS.includes(key)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) throw 'Please pick a valid date.';
    } else if (URL_KEYS.includes(key)) {
      value = normalizeUrl(value);
    } else if (MONEY_KEYS.includes(key)) {
      const n = Number(value.replace(/[$,\s]/g, ''));
      if (!Number.isFinite(n) || n < 0) throw 'Amounts need to be numbers.';
      value = String(Math.round(n));
    }
    out[key] = value;
  }

  for (const key of spec.required) {
    if (!out[key]) throw `A ${tag} post needs ${FIELD_LABELS[key] || key}.`;
  }

  return Object.keys(out).length ? out : null;
};

// Validate a shared track or album. Returns { type, data } or null.
const normalizeAttachment = (raw) => {
  if (!raw) return null;
  if (raw.type === 'track') {
    const t = raw.track || {};
    if (!t.title || !t.artist) throw 'A shared track needs a title and artist.';
    return {
      type: 'track',
      data: {
        title: String(t.title), artist: String(t.artist),
        album: t.album || null, genre: t.genre || null,
        coverUrl: t.coverUrl || null, audioUrl: t.audioUrl || null,
      },
    };
  }
  if (raw.type === 'album') {
    const a = raw.album || {};
    if (!a.album || !a.artist) throw 'A shared album needs a name and artist.';
    return {
      type: 'album',
      data: { album: String(a.album), artist: String(a.artist), genre: a.genre || null, coverUrl: a.coverUrl || null },
    };
  }
  throw 'Unknown attachment type.';
};

const parseJsonField = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { throw 'Malformed request.'; }
};

// Best-effort removal of an uploaded post photo
const deleteUploadedFile = (publicUrl) => {
  const filePath = uploadPathFromUrl(uploadDir, publicUrl);
  if (!filePath) return;
  fs.unlink(filePath, (err) => {
    if (err && err.code !== 'ENOENT') console.error('Failed to delete post image:', err.message);
  });
};

// ── Author shape: real accounts link to a profile; seeded demo posts carry
// a display-only author. ──
const mapAuthor = (row, prefix = '') => {
  if (row[`${prefix}author_id`]) {
    return {
      id: row[`${prefix}author_id`],
      username: row[`${prefix}username`],
      name: row[`${prefix}display_name`] || row[`${prefix}username`],
      profilePicture: row[`${prefix}profile_picture`] || null,
      isArtist: Boolean(row[`${prefix}is_artist`]),
      verified: Boolean(row[`${prefix}artist_verified`]),
      hue: null,
      seeded: false,
    };
  }
  const s = row[`${prefix}seed_author`] || {};
  return {
    id: null, username: s.handle || null, name: s.name || 'Ponytail',
    profilePicture: null, isArtist: Boolean(s.isArtist), verified: Boolean(s.isArtist), hue: s.hue ?? null, seeded: true,
  };
};

const mapPost = (row, userId) => ({
  id: row.id,
  author: mapAuthor(row),
  mine: Boolean(row.author_id) && row.author_id === userId,
  body: row.body,
  tag: row.tag,
  details: row.details,
  imageUrl: row.image_url,
  attachmentType: row.attachment_type,
  attachment: row.attachment,
  seedMedia: row.seed_media,
  createdAt: row.created_at,
  likeCount: row.like_count + row.seed_likes,
  replyCount: row.reply_count,
  repostCount: row.seed_reposts,
  likedByMe: row.liked_by_me,
});

const mapReply = (row, userId) => ({
  id: row.id,
  postId: row.post_id,
  author: mapAuthor(row),
  mine: Boolean(row.author_id) && row.author_id === userId,
  body: row.body,
  createdAt: row.created_at,
});

// Hide anything to or from someone the viewer has blocked, or who blocked them.
const notBlocked = (col) => `(${col} IS NULL OR NOT EXISTS (
  SELECT 1 FROM user_blocks b
  WHERE (b.blocker_id = $1 AND b.blocked_id = ${col})
     OR (b.blocker_id = ${col} AND b.blocked_id = $1)))`;

const POST_SELECT = `
  SELECT p.*, u.username, u.display_name, u.profile_picture, u.is_artist, u.artist_verified,
    (SELECT COUNT(*)::int FROM bulletin_post_likes l WHERE l.post_id = p.id) AS like_count,
    (SELECT COUNT(*)::int FROM bulletin_replies r WHERE r.post_id = p.id AND ${notBlocked('r.author_id')}) AS reply_count,
    EXISTS (SELECT 1 FROM bulletin_post_likes l WHERE l.post_id = p.id AND l.user_id = $1) AS liked_by_me
  FROM bulletin_posts p
  LEFT JOIN users u ON u.id = p.author_id`;

const fetchPost = async (postId, userId) => {
  const result = await db.query(`${POST_SELECT} WHERE p.id = $2 AND ${notBlocked('p.author_id')}`, [userId, postId]);
  return result.rows[0] ? mapPost(result.rows[0], userId) : null;
};

// GET /api/bulletin/posts?before=<ISO> — newest first, PAGE_SIZE at a time
const getPosts = async (req, res) => {
  const userId = req.user.id;
  const { before } = req.query;
  try {
    const result = await db.query(
      `${POST_SELECT}
       WHERE ($2::timestamptz IS NULL OR p.created_at < $2::timestamptz)
         AND ${notBlocked('p.author_id')}
       ORDER BY p.created_at DESC
       LIMIT $3`,
      [userId, before || null, PAGE_SIZE + 1]
    );
    const rows = result.rows.slice(0, PAGE_SIZE);
    res.json({ posts: rows.map(r => mapPost(r, userId)), hasMore: result.rows.length > PAGE_SIZE });
  } catch (err) {
    console.error('Get bulletin posts error:', err);
    res.status(500).json({ error: 'Failed to load the bulletin.' });
  }
};

// POST /api/bulletin/posts — multipart: body, tag, details (JSON), attachment (JSON), image (file)
const createPost = async (req, res) => {
  const userId = req.user.id;
  const imageUrl = req.file ? `http://localhost:5000/uploads/${req.file.filename}` : null;
  const fail = (status, error) => {
    deleteUploadedFile(imageUrl);
    return res.status(status).json({ error });
  };

  try {
    const userResult = await db.query('SELECT is_artist FROM users WHERE id = $1', [userId]);
    if (!userResult.rows[0]) return fail(404, 'Account not found.');
    const isArtist = Boolean(userResult.rows[0].is_artist);

    const body = String(req.body.body || '').trim();
    const tag = String(req.body.tag || '').trim();
    if (!body) return fail(400, 'Write something before posting.');
    if (body.length > MAX_BODY_LENGTH) return fail(400, `Posts can be up to ${MAX_BODY_LENGTH} characters.`);
    if (!allowedTagsFor(isArtist).includes(tag)) return fail(400, 'Pick a tag for your post.');

    let details, attachment;
    try {
      details = normalizeDetails(tag, parseJsonField(req.body.details));
      attachment = normalizeAttachment(parseJsonField(req.body.attachment));
    } catch (msg) {
      return fail(400, typeof msg === 'string' ? msg : 'Malformed request.');
    }

    const insert = await db.query(
      `INSERT INTO bulletin_posts (author_id, body, tag, details, image_url, attachment_type, attachment)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [userId, body, tag, details, imageUrl, attachment?.type || null, attachment?.data || null]
    );
    const post = await fetchPost(insert.rows[0].id, userId);
    res.status(201).json({ post });
  } catch (err) {
    console.error('Create bulletin post error:', err);
    fail(500, 'Failed to publish your post.');
  }
};

// DELETE /api/bulletin/posts/:id — authors only
const deletePost = async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM bulletin_posts WHERE id = $1 AND author_id = $2 RETURNING image_url',
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Post not found.' });
    deleteUploadedFile(result.rows[0].image_url);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete bulletin post error:', err);
    res.status(500).json({ error: 'Failed to delete the post.' });
  }
};

// POST / DELETE /api/bulletin/posts/:id/like — returns the fresh count
const setLike = (liked) => async (req, res) => {
  const userId = req.user.id;
  const postId = req.params.id;
  try {
    const post = await fetchPost(postId, userId);
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    if (liked) {
      await db.query(
        'INSERT INTO bulletin_post_likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [postId, userId]
      );
    } else {
      await db.query('DELETE FROM bulletin_post_likes WHERE post_id = $1 AND user_id = $2', [postId, userId]);
    }
    const fresh = await fetchPost(postId, userId);
    res.json({ likeCount: fresh.likeCount, likedByMe: fresh.likedByMe });
  } catch (err) {
    console.error('Bulletin like error:', err);
    res.status(500).json({ error: 'Failed to update your like.' });
  }
};

const REPLY_SELECT = `
  SELECT r.*, u.username, u.display_name, u.profile_picture, u.is_artist, u.artist_verified
  FROM bulletin_replies r
  LEFT JOIN users u ON u.id = r.author_id`;

// GET /api/bulletin/posts/:id/replies — oldest first
const getReplies = async (req, res) => {
  const userId = req.user.id;
  try {
    const post = await fetchPost(req.params.id, userId);
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    const result = await db.query(
      `${REPLY_SELECT} WHERE r.post_id = $2 AND ${notBlocked('r.author_id')} ORDER BY r.created_at ASC`,
      [userId, req.params.id]
    );
    res.json({ post, replies: result.rows.map(r => mapReply(r, userId)) });
  } catch (err) {
    console.error('Get bulletin replies error:', err);
    res.status(500).json({ error: 'Failed to load replies.' });
  }
};

// POST /api/bulletin/posts/:id/replies — { body }
const createReply = async (req, res) => {
  const userId = req.user.id;
  const body = String(req.body?.body || '').trim();
  if (!body) return res.status(400).json({ error: 'Write something before replying.' });
  if (body.length > MAX_REPLY_LENGTH) return res.status(400).json({ error: `Replies can be up to ${MAX_REPLY_LENGTH} characters.` });
  try {
    const post = await fetchPost(req.params.id, userId);
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    const insert = await db.query(
      'INSERT INTO bulletin_replies (post_id, author_id, body) VALUES ($1, $2, $3) RETURNING id',
      [req.params.id, userId, body]
    );
    const result = await db.query(`${REPLY_SELECT} WHERE r.id = $1`, [insert.rows[0].id]);
    res.status(201).json({ reply: mapReply(result.rows[0], userId), replyCount: post.replyCount + 1 });
  } catch (err) {
    console.error('Create bulletin reply error:', err);
    res.status(500).json({ error: 'Failed to post your reply.' });
  }
};

// DELETE /api/bulletin/replies/:id — authors only
const deleteReply = async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM bulletin_replies WHERE id = $1 AND author_id = $2 RETURNING post_id',
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Reply not found.' });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete bulletin reply error:', err);
    res.status(500).json({ error: 'Failed to delete the reply.' });
  }
};

module.exports = {
  getPosts, createPost, deletePost,
  likePost: setLike(true), unlikePost: setLike(false),
  getReplies, createReply, deleteReply,
};
