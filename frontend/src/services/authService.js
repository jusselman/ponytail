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

// Register. `is_artist` and `display_name` are optional — `is_artist` is only ever
// sent true by the separate musician signup flow (regular listener signup never
// passes it, so it defaults to false server-side exactly as before), and
// `display_name` becomes the musician's public artist/stage name.
//
// `musicianProfile`, if provided, carries the extra musician-onboarding answers —
// location (city), genre, subgenre, mood, soundDescription (Tag 5) — which seed
// both the personalized radio station and every track that musician later
// uploads (see uploadTrack, which no longer takes its own genre for this reason).
export const register = async (email, username, password, is_artist = false, display_name = null, musicianProfile = null) => {
  const response = await axios.post(`${API_URL}/auth/register`, {
    email,
    username,
    password,
    is_artist,
    display_name,
    location: musicianProfile?.location || null,
    genre: musicianProfile?.genre || null,
    subgenre: musicianProfile?.subgenre || null,
    mood: musicianProfile?.mood || null,
    sound_description: musicianProfile?.soundDescription || null,
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

// Upload a track — musician accounts only (enforced server-side via is_artist).
// `audioFile`/`coverFile` are File/Blob objects from <input type="file">; coverFile is optional.
// No genre field here anymore — the backend stamps genre/subgenre/mood/tag5/location
// onto every upload from the musician's own profile (set during onboarding), so the
// catalog row matches the same tag vocabulary without asking again per track.
export const uploadTrack = async ({ title, album, audioFile, coverFile }) => {
  const token = await getToken();

  const formData = new FormData();
  formData.append('title', title);
  if (album) formData.append('album', album);
  formData.append('audio', audioFile);
  if (coverFile) formData.append('cover', coverFile);

  const response = await axios.post(`${API_URL}/auth/tracks/upload`, formData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.track;
};

// Get the current musician's own uploaded tracks
export const getMyUploads = async () => {
  const token = await getToken();
  const response = await axios.get(`${API_URL}/auth/tracks/mine`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.tracks;
};

// Update one of the current musician's own uploaded tracks — title/album/genre,
// plus an optional replacement cover image. `coverFile`, if provided, is a
// File/Blob from an <input type="file">.
export const updateMyUpload = async (trackId, { title, album, genre, coverFile }) => {
  const token = await getToken();

  const formData = new FormData();
  formData.append('title', title);
  if (album) formData.append('album', album);
  if (genre) formData.append('genre', genre);
  if (coverFile) formData.append('cover', coverFile);

  const response = await axios.put(`${API_URL}/auth/tracks/${trackId}`, formData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.track;
};

// Delete one of the current musician's own uploaded tracks
export const deleteMyUpload = async (trackId) => {
  const token = await getToken();
  await axios.delete(`${API_URL}/auth/tracks/${trackId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Hot in Here — other musicians uploading tracks in the same city (interim
// same-city match; see the backend route comment for the real-geocoding plan)
export const getHotInHere = async () => {
  const token = await getToken();
  const response = await axios.get(`${API_URL}/auth/radio/hot-in-here`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// The current musician's personalized radio station — their own uploads plus
// catalog tracks matching their profile's genre/subgenre/mood/similar-artist
export const getMyStation = async () => {
  const token = await getToken();
  const response = await axios.get(`${API_URL}/auth/radio/my-station`, {
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