const db = require('../config/db');

// POST /api/playlists — create a new playlist owned by the current user.
// Sent as multipart/form-data so an optional cover image ('cover' field) can ride along.
const createPlaylist = async (req, res) => {
  const { title, description, is_public } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Playlist name is required.' });
  }

  // ── Form fields arrive as strings over multipart, so parse explicitly. Default to public. ──
  const isPublic = is_public === undefined ? true : is_public === 'true' || is_public === true;

  const coverArtUrl = req.file
    ? `http://localhost:5000/uploads/${req.file.filename}`
    : null;

  try {
    const result = await db.query(
      `INSERT INTO playlists (user_id, title, description, cover_art_url, is_public)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, title, description, cover_art_url, is_public, created_at, updated_at`,
      [req.user.id, title.trim(), description?.trim() || null, coverArtUrl, isPublic]
    );

    res.status(201).json({ playlist: result.rows[0] });
  } catch (err) {
    console.error('Create playlist error:', err);
    res.status(500).json({ error: 'Failed to create playlist.' });
  }
};

// GET /api/playlists — list the current user's playlists, most recently updated first,
// with a live track count pulled from playlist_tracks
const getMyPlaylists = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.id, p.title, p.description, p.cover_art_url, p.is_public,
              p.created_at, p.updated_at,
              COUNT(pt.id)::int AS track_count
       FROM playlists p
       LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.id
       WHERE p.user_id = $1
       GROUP BY p.id
       ORDER BY p.updated_at DESC`,
      [req.user.id]
    );

    res.json({ playlists: result.rows });
  } catch (err) {
    console.error('Get my playlists error:', err);
    res.status(500).json({ error: 'Failed to fetch playlists.' });
  }
};

// ── Shared helper: fetch a playlist row (with creator username) and confirm the
// requesting user owns it ──
const getOwnedPlaylist = async (playlistId, userId) => {
  const result = await db.query(
    `SELECT p.id, p.user_id, p.title, p.description, p.cover_art_url, p.is_public,
            p.created_at, p.updated_at, u.username AS creator_username
     FROM playlists p
     JOIN users u ON u.id = p.user_id
     WHERE p.id = $1`,
    [playlistId]
  );
  const playlist = result.rows[0];
  if (!playlist) return { playlist: null, owned: false };
  return { playlist, owned: playlist.user_id === userId };
};

// GET /api/playlists/:id — playlist details plus its tracks in play order
const getPlaylistDetail = async (req, res) => {
  const { id } = req.params;

  try {
    const { playlist, owned } = await getOwnedPlaylist(id, req.user.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found.' });
    if (!owned) return res.status(403).json({ error: 'Not your playlist.' });

    const tracksResult = await db.query(
      `SELECT id, track_title AS title, artist, album, genre, cover_url AS "coverUrl",
              audio_url AS "audioUrl", position, added_at
       FROM playlist_tracks
       WHERE playlist_id = $1
       ORDER BY position ASC`,
      [id]
    );

    res.json({ playlist: { ...playlist, tracks: tracksResult.rows } });
  } catch (err) {
    console.error('Get playlist detail error:', err);
    res.status(500).json({ error: 'Failed to fetch playlist.' });
  }
};

// POST /api/playlists/:id/tracks — append a track to the end of the playlist.
// Track identity follows the app-wide convention of (title, artist) rather than an id,
// since the real catalog (seed_tracks) has no id exposed to the frontend.
const addTrackToPlaylist = async (req, res) => {
  const { id } = req.params;
  const { title, artist, album, genre, coverUrl, audioUrl } = req.body;

  if (!title || !artist) {
    return res.status(400).json({ error: 'Title and artist are required.' });
  }

  try {
    const { playlist, owned } = await getOwnedPlaylist(id, req.user.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found.' });
    if (!owned) return res.status(403).json({ error: 'Not your playlist.' });

    const insertResult = await db.query(
      `INSERT INTO playlist_tracks
        (playlist_id, track_title, artist, album, genre, cover_url, audio_url, position)
       VALUES (
         $1, $2, $3, $4, $5, $6, $7,
         COALESCE((SELECT MAX(position) + 1 FROM playlist_tracks WHERE playlist_id = $1), 0)
       )
       ON CONFLICT (playlist_id, track_title, artist) DO NOTHING
       RETURNING id, track_title AS title, artist, album, genre, cover_url AS "coverUrl",
                 audio_url AS "audioUrl", position, added_at`,
      [id, title, artist, album || null, genre || null, coverUrl || null, audioUrl || null]
    );

    if (insertResult.rows.length === 0) {
      // ── Already in the playlist — return the existing row instead of erroring ──
      const existing = await db.query(
        `SELECT id, track_title AS title, artist, album, genre, cover_url AS "coverUrl",
                audio_url AS "audioUrl", position, added_at
         FROM playlist_tracks
         WHERE playlist_id = $1 AND track_title = $2 AND artist = $3`,
        [id, title, artist]
      );
      return res.status(200).json({ track: existing.rows[0], alreadyAdded: true });
    }

    await db.query(`UPDATE playlists SET updated_at = NOW() WHERE id = $1`, [id]);

    res.status(201).json({ track: insertResult.rows[0] });
  } catch (err) {
    console.error('Add track to playlist error:', err);
    res.status(500).json({ error: 'Failed to add track.' });
  }
};

// DELETE /api/playlists/:id/tracks/:trackRowId — remove a single track from the playlist
const removeTrackFromPlaylist = async (req, res) => {
  const { id, trackRowId } = req.params;

  try {
    const { playlist, owned } = await getOwnedPlaylist(id, req.user.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found.' });
    if (!owned) return res.status(403).json({ error: 'Not your playlist.' });

    const result = await db.query(
      `DELETE FROM playlist_tracks WHERE id = $1 AND playlist_id = $2 RETURNING id`,
      [trackRowId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Track not found in this playlist.' });
    }

    await db.query(`UPDATE playlists SET updated_at = NOW() WHERE id = $1`, [id]);

    res.json({ success: true });
  } catch (err) {
    console.error('Remove track from playlist error:', err);
    res.status(500).json({ error: 'Failed to remove track.' });
  }
};

// PUT /api/playlists/:id/tracks/reorder — persist a new track order after a drag-and-drop.
// Body: { orderedIds: [playlist_tracks.id, ...] } — index in the array becomes the new position.
const reorderPlaylistTracks = async (req, res) => {
  const { id } = req.params;
  const { orderedIds } = req.body;

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return res.status(400).json({ error: 'orderedIds must be a non-empty array.' });
  }

  try {
    const { playlist, owned } = await getOwnedPlaylist(id, req.user.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found.' });
    if (!owned) return res.status(403).json({ error: 'Not your playlist.' });

    // ── A real transaction needs one dedicated client — db.query() borrows a fresh
    // connection from the pool per call, so BEGIN/COMMIT would land on different
    // connections and never actually group these updates. ──
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < orderedIds.length; i++) {
        await client.query(
          `UPDATE playlist_tracks SET position = $1 WHERE id = $2 AND playlist_id = $3`,
          [i, orderedIds[i], id]
        );
      }
      await client.query(`UPDATE playlists SET updated_at = NOW() WHERE id = $1`, [id]);
      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Reorder playlist tracks error:', err);
    res.status(500).json({ error: 'Failed to reorder playlist.' });
  }
};

// PUT /api/playlists/:id — partial update (title/description/is_public/cover).
// Sent as multipart/form-data when a new cover image rides along (Edit Details form),
// or as plain JSON for quick actions like the visibility toggle — either works since
// multer only engages when the request is actually multipart.
const updatePlaylist = async (req, res) => {
  const { id } = req.params;

  try {
    const { playlist, owned } = await getOwnedPlaylist(id, req.user.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found.' });
    if (!owned) return res.status(403).json({ error: 'Not your playlist.' });

    const { title, description, is_public } = req.body;

    const nextTitle = title !== undefined ? title.trim() : playlist.title;
    if (!nextTitle) {
      return res.status(400).json({ error: 'Playlist name is required.' });
    }

    const nextDescription = description !== undefined
      ? (description?.trim() || null)
      : playlist.description;

    const nextIsPublic = is_public !== undefined
      ? (is_public === 'true' || is_public === true)
      : playlist.is_public;

    const nextCoverArtUrl = req.file
      ? `http://localhost:5000/uploads/${req.file.filename}`
      : playlist.cover_art_url;

    const result = await db.query(
      `UPDATE playlists
       SET title = $1, description = $2, is_public = $3, cover_art_url = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING id, user_id, title, description, cover_art_url, is_public, created_at, updated_at`,
      [nextTitle, nextDescription, nextIsPublic, nextCoverArtUrl, id]
    );

    res.json({ playlist: { ...result.rows[0], creator_username: playlist.creator_username } });
  } catch (err) {
    console.error('Update playlist error:', err);
    res.status(500).json({ error: 'Failed to update playlist.' });
  }
};

// DELETE /api/playlists/:id — playlist_tracks rows cascade-delete via the FK in schema.sql
const deletePlaylist = async (req, res) => {
  const { id } = req.params;

  try {
    const { playlist, owned } = await getOwnedPlaylist(id, req.user.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found.' });
    if (!owned) return res.status(403).json({ error: 'Not your playlist.' });

    await db.query(`DELETE FROM playlists WHERE id = $1`, [id]);

    res.json({ success: true });
  } catch (err) {
    console.error('Delete playlist error:', err);
    res.status(500).json({ error: 'Failed to delete playlist.' });
  }
};

module.exports = {
  createPlaylist,
  getMyPlaylists,
  getPlaylistDetail,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  reorderPlaylistTracks,
  updatePlaylist,
  deletePlaylist,
};
