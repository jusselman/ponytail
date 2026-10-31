const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../middleware/authMiddleware');
const limits = require('../middleware/rateLimits');
const { isAllowed, safeFilename, verifyUploads } = require('../utils/uploads');
const {
  createPlaylist,
  getMyPlaylists,
  getPlaylistDetail,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  reorderPlaylistTracks,
  updatePlaylist,
  deletePlaylist,
  getFollowedPlaylists,
  followPlaylist,
  unfollowPlaylist,
} = require('../controllers/playlistController');

// ── Ensure uploads directory exists (shared with avatar uploads) ──
const uploadDir = path.join(__dirname, '../../assets/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ── Multer config for playlist cover images ──
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, safeFilename('playlist-cover', req.user.id, file.mimetype)),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    isAllowed(file.mimetype, 'image') ? cb(null, true) : cb(new Error('Invalid file type'));
  },
});

// Create a playlist — optional 'cover' image field
router.post('/', requireAuth, limits.uploads, upload.single('cover'), verifyUploads, createPlaylist);

// List the current user's playlists
router.get('/', requireAuth, getMyPlaylists);

// List playlists the current user follows — must come before /:id so
// 'followed' isn't swallowed as a playlist id param
router.get('/followed', requireAuth, getFollowedPlaylists);

// Get a single playlist's details + ordered tracks
router.get('/:id', requireAuth, getPlaylistDetail);

// Update playlist details (title/description/is_public/cover) — optional 'cover' image field
router.put('/:id', requireAuth, limits.uploads, upload.single('cover'), verifyUploads, updatePlaylist);

// Delete a playlist
router.delete('/:id', requireAuth, deletePlaylist);

// Add a track to a playlist
router.post('/:id/tracks', requireAuth, addTrackToPlaylist);

// Persist a new track order after drag-and-drop reorder
router.put('/:id/tracks/reorder', requireAuth, reorderPlaylistTracks);

// Remove a track from a playlist
router.delete('/:id/tracks/:trackRowId', requireAuth, removeTrackFromPlaylist);

// Follow / unfollow another user's public playlist
router.post('/:id/follow', requireAuth, followPlaylist);
router.delete('/:id/follow', requireAuth, unfollowPlaylist);

module.exports = router;
