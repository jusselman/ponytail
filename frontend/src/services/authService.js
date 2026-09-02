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

// Musicians and people the current user follows — powers ProfilePanel's
// "Musicians You Follow" / "People You Follow" rows
export const getFollowing = async () => {
  const token = await getToken();
  const response = await axios.get(`${API_URL}/auth/users/me/following`, {
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

// Update profile — generic passthrough, so it serves both the favorite-artists
// picker and EditProfilePanel (display_name, location, genre, subgenre, mood,
// sound_description). Only include the fields you want changed; the backend
// only updates whatever keys are present in `data`.
export const updateProfile = async (data) => {
  const token = await getToken();
  const response = await axios.put(`${API_URL}/auth/update-profile`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// Permanently delete the current user's account — irreversible. The backend
// cascades everything the account owns (playlists, follows, watch/search
// history) and unattributes rather than deletes any tracks they uploaded, so
// the shared catalog stays intact for everyone else. Does not clear the local
// token itself — the caller (SettingsPanel's delete-account flow) does that
// via logout() afterward, same as the rest of its cleanup.
export const deleteAccount = async () => {
  const token = await getToken();
  const response = await axios.delete(`${API_URL}/auth/account`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// Change password — works for a listener or an artist account alike. Requires
// the current password server-side to verify identity before the new one is set.
export const changePassword = async (currentPassword, newPassword) => {
  const token = await getToken();
  const response = await axios.put(`${API_URL}/auth/change-password`, {
    currentPassword,
    newPassword,
  }, {
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

// ─── Frequency-dial Radio tab ─ custom stations + GOAT/UN-GOAT ──────────────────────

// Metadata for the user's custom stations plus their GOAT/UN-GOAT slot
// ({ artist, mode }). Does not include track pools — fetch a station's tracks
// lazily via getStationTracks/getGoatTracks once the user tunes to it.
export const getRadioStations = async () => {
  const token = await getToken();
  const response = await axios.get(`${API_URL}/auth/radio/stations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// Create a custom station, seeded from one artist (auto-populated with their
// catalog + similar-artist matches server-side).
export const createRadioStation = async (name, seedArtist) => {
  const token = await getToken();
  const response = await axios.post(`${API_URL}/auth/radio/stations`, { name, seedArtist }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const deleteRadioStation = async (stationId) => {
  const token = await getToken();
  const response = await axios.delete(`${API_URL}/auth/radio/stations/${stationId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// A custom station's track pool (UN-GOAT exclusion already applied server-side)
export const getStationTracks = async (stationId) => {
  const token = await getToken();
  const response = await axios.get(`${API_URL}/auth/radio/stations/${stationId}/tracks`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// Set/change the GOAT artist and/or toggle GOAT <-> UN-GOAT mode. Pass only
// the field you want changed — { artist } to (re)pick the GOAT, { mode } to
// flip modes, or both at once.
export const setGoat = async ({ artist, mode } = {}) => {
  const token = await getToken();
  const body = {};
  if (artist !== undefined) body.artist = artist;
  if (mode !== undefined) body.mode = mode;
  const response = await axios.put(`${API_URL}/auth/radio/goat`, body, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// The GOAT station's track pool ─ empty in 'ungoat' mode (that mode's whole
// purpose is excluding the artist elsewhere, not playing them here)
export const getGoatTracks = async () => {
  const token = await getToken();
  const response = await axios.get(`${API_URL}/auth/radio/goat/tracks`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// Artist name autocomplete ─ used by the add-station and GOAT-picker artist
// search inputs.
export const searchArtists = async (q) => {
  const token = await getToken();
  const response = await axios.get(`${API_URL}/auth/artists/search`, {
    params: { q },
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// Thumbs up (1) / thumbs down (-1) a track ─ personalized signal recorded
// against user_play_history, distinct from the track's global like/dislike
// counters.
export const rateTrack = async (track, rating) => {
  const token = await getToken();
  const response = await axios.post(`${API_URL}/auth/history/rate`, {
    title: track.title,
    artist: track.artist,
    album: track.album,
    genre: track.genre,
    rating,
  }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};
