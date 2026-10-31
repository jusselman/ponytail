const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const limits = require('../middleware/rateLimits');
const { createClaim, getMyClaims } = require('../controllers/claimController');

// Ask to be verified as a catalog artist
router.post('/', requireAuth, limits.claims, createClaim);

// Your own claims and their status
router.get('/mine', requireAuth, getMyClaims);

// There is deliberately no approve/reject route: claims are reviewed by the
// team with backend/scripts/reviewClaims.js.

module.exports = router;
