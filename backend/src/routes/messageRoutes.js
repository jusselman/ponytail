const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const {
  getConversations,
  getUnreadCount,
  openConversation,
  getMessages,
  sendMessage,
  markConversationRead,
} = require('../controllers/messageController');

// Inbox — every conversation the current user is part of
router.get('/conversations', requireAuth, getConversations);

// Total unread messages, for the header badge (polled)
router.get('/unread-count', requireAuth, getUnreadCount);

// Get or create the conversation with another user ({ username })
router.post('/conversations', requireAuth, openConversation);

// A conversation's messages (?after= for polling, ?before= for scrollback)
router.get('/conversations/:id/messages', requireAuth, getMessages);

// Send a message (text and/or a shared track/playlist)
router.post('/conversations/:id/messages', requireAuth, sendMessage);

// Mark the other person's messages in this thread as read
router.post('/conversations/:id/read', requireAuth, markConversationRead);

module.exports = router;
