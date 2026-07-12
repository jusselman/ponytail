import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://localhost:5000/api';

// Store token after login/register
const storeToken = async (token) => {
  await AsyncStorage.setItem('ponytail_token', token);
};

// Retrieve token for authenticated requests
export const getToken = async () => {
  return await AsyncStorage.getItem('ponytail_token');
};

// Clear token on logout
export const logout = async () => {
  await AsyncStorage.removeItem('ponytail_token');
};

// Register
export const register = async (email, username, password) => {
  const response = await axios.post(`${API_URL}/auth/register`, {
    email,
    username,
    password,
  });
  await storeToken(response.data.token);
  return response.data;
};

// Login
export const login = async (email, password) => {
  const response = await axios.post(`${API_URL}/auth/login`, {
    email,
    password,
  });
  await storeToken(response.data.token);
  return response.data;
};

// Get current logged in user
export const getMe = async () => {
  const token = await getToken();
  const response = await axios.get(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// Get another user's public profile (username, avatar, taste, public playlists)
export const getPublicProfile = async (username) => {
  const token = await getToken();
  const response = await axios.get(`${API_URL}/auth/users/${encodeURIComponent(username)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// Follow another user
export const followUser = async (username) => {
  const token = await getToken();
  const response = await axios.post(`${API_URL}/auth/users/${encodeURIComponent(username)}/follow`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// Unfollow another user
export const unfollowUser = async (username) => {
  const token = await getToken();
  const response = await axios.delete(`${API_URL}/auth/users/${encodeURIComponent(username)}/follow`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// Update profile with favorite artists
export const updateProfile = async (data) => {
  const token = await getToken();
  const response = await axios.put(`${API_URL}/auth/update-profile`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// ── Record a track play in the user's permanent history ──
const recordPlayHistory = async (track) => {
  try {
    const token = await AsyncStorage.getItem('ponytail_token');
    if (!token) return;

    await fetch('http://localhost:5000/api/auth/history/play', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: track.title,
        artist: track.artist,
        album: track.album,
        genre: track.genre,
      }),
    });
  } catch (err) {
    console.log('Failed to record play history:', err);
  }
};

// ── Record a track tapped specifically from search results ──
const recordSearchSelection = async (track) => {
  try {
    const token = await AsyncStorage.getItem('ponytail_token');
    if (!token) return;

    await fetch('http://localhost:5000/api/auth/history/search-selection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: track.title,
        artist: track.artist,
        album: track.album,
        genre: track.genre,
      }),
    });
  } catch (err) {
    console.log('Failed to record search selection:', err);
  }
};