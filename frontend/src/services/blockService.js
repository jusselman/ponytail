import axios from 'axios';
import { getToken } from './authService';

const API_URL = 'http://localhost:5000/api';

const authHeaders = async () => ({ Authorization: `Bearer ${await getToken()}` });

// Everyone the current user has blocked: [{ id, username, displayName, profilePicture, isArtist, blockedAt }]
export const getBlockedUsers = async () => {
  const response = await axios.get(`${API_URL}/blocks`, { headers: await authHeaders() });
  return response.data.users;
};

// Block another user. For now this only stops direct messages in both directions.
export const blockUser = async (username) => {
  await axios.post(`${API_URL}/blocks/${encodeURIComponent(username)}`, null, { headers: await authHeaders() });
};

export const unblockUser = async (username) => {
  await axios.delete(`${API_URL}/blocks/${encodeURIComponent(username)}`, { headers: await authHeaders() });
};
