const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { isAllowed, safeFilename, verifyUploads } = require('../utils/uploads');
const {
  getPosts, createPost, deletePost,
  likePost, unlikePost,
  getReplies, createReply, deleteReply,
} = require('../controllers/bulletinController');

// ── Post photos go next to avatars and track uploads in assets/uploads ──
const uploadDir = path.join(__dirname, '../../assets/uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const imageUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, safeFilename('post', req.user.id, file.mimetype)),
  }),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    isAllowed(file.mimetype, 'image') ? cb(null, true) : cb(new Error('Photos need to be JPG, PNG, WEBP or GIF.'));
  },
});

// Turn multer errors (too big, wrong type) into a readable 400
const optionalImage = (req, res, next) => {
  imageUpload.single('image')(req, res, (err) => {
    if (!err) return verifyUploads(req, res, next);
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Photos can be up to 8MB.' : err.message;
    res.status(400).json({ error: message });
  });
};

// Feed, newest first (?before= for the next page)
router.get('/posts', requireAuth, getPosts);

// Publish a post (multipart, optional image)
router.post('/posts', requireAuth, optionalImage, createPost);

// Delete your own post
router.delete('/posts/:id', requireAuth, deletePost);

// Like / unlike
router.post('/posts/:id/like', requireAuth, likePost);
router.delete('/posts/:id/like', requireAuth, unlikePost);

// Reply thread
router.get('/posts/:id/replies', requireAuth, getReplies);
router.post('/posts/:id/replies', requireAuth, createReply);
router.delete('/replies/:id', requireAuth, deleteReply);

module.exports = router;
