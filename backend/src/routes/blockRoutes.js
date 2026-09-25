const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { getBlockedUsers, blockUser, unblockUser } = require('../controllers/blockController');

// Everyone the current user has blocked (Settings > Privacy > Blocked Users)
router.get('/', requireAuth, getBlockedUsers);

// Block / unblock another user by username
router.post('/:username', requireAuth, blockUser);
router.delete('/:username', requireAuth, unblockUser);

module.exports = router;
