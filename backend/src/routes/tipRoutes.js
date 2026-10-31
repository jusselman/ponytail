const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const limits = require('../middleware/rateLimits');
const { getRecipient, createTip, getReceivedTips } = require('../controllers/tipController');

// Who a tip would go to (shown in the Tip panel before paying)
router.get('/recipient', requireAuth, getRecipient);

// Send a tip (after the mock checkout succeeds)
router.post('/', requireAuth, limits.tips, createTip);

// Your own tips received, private to you
router.get('/received', requireAuth, getReceivedTips);

module.exports = router;
