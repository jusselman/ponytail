import axios from 'axios';
import { getToken } from './authService';

const API_URL = 'http://localhost:5000/api';

const authHeaders = async () => ({ Authorization: `Bearer ${await getToken()}` });

// Inbox: every conversation, most recent first, with the other user, last
// message preview, and per-thread unread count
export const getConversations = async () => {
  const response = await axios.get(`${API_URL}/messages/conversations`, {
    headers: await authHeaders(),
  });
  return response.data.conversations;
};

// Total unread messages across all threads (header badge)
export const getUnreadCount = async () => {
  const response = await axios.get(`${API_URL}/messages/unread-count`, {
    headers: await authHeaders(),
  });
  return response.data.count;
};

// Get or create the conversation with another user. Returns { id, otherUser }.
export const openConversation = async (username) => {
  const response = await axios.post(
    `${API_URL}/messages/conversations`,
    { username },
    { headers: await authHeaders() }
  );
  return response.data.conversation;
};

// A thread's messages, oldest → newest. Pass `after` (ISO timestamp of the newest
// message you already have) to poll for only new ones, or `before` for scrollback.
export const getMessages = async (conversationId, { after, before } = {}) => {
  const response = await axios.get(`${API_URL}/messages/conversations/${conversationId}/messages`, {
    headers: await authHeaders(),
    params: { after, before },
  });
  return response.data; // { conversation, messages, hasMore, otherLastReadAt }
};

// Send a message. `attachment` is optional:
//   { type: 'track', track: { title, artist, album, genre, coverUrl, audioUrl } }
//   { type: 'playlist', playlistId }
export const sendMessage = async (conversationId, { body, attachment } = {}) => {
  const response = await axios.post(
    `${API_URL}/messages/conversations/${conversationId}/messages`,
    { body, attachment },
    { headers: await authHeaders() }
  );
  return response.data.message;
};

// Mark everything the other person sent in this thread as read
export const markConversationRead = async (conversationId) => {
  await axios.post(`${API_URL}/messages/conversations/${conversationId}/read`, null, {
    headers: await authHeaders(),
  });
};
