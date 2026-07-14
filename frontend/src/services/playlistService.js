import axios from 'axios';
import { getToken } from './authService';

const API_URL = 'http://localhost:5000/api';

// Create a new playlist. `coverImage`, if provided, is a File/Blob from an <input type="file">
// and is sent alongside the text fields as multipart/form-data.
export const createPlaylist = async ({ title, description, is_public, coverImage }) => {
  const token = await getToken();

  const formData = new FormData();
  formData.append('title', title);
  if (description) formData.append('description', description);
  formData.append('is_public', String(is_public));
  if (coverImage) formData.append('cover', coverImage);

  const response = await axios.post(`${API_URL}/playlists`, formData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.playlist;
};

// Get the current user's playlists
export const getMyPlaylists = async () => {
  const token = await getToken();
  const response = await axios.get(`${API_URL}/playlists`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.playlists;
};

// Get a single playlist's details plus its tracks, in play order
export const getPlaylistDetail = async (playlistId) => {
  const token = await getToken();
  const response = await axios.get(`${API_URL}/playlists/${playlistId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.playlist;
};

// Add a track to a playlist. `track` follows the shape returned by searchTracks below.
export const addTrackToPlaylist = async (playlistId, track) => {
  const token = await getToken();
  const response = await axios.post(
    `${API_URL}/playlists/${playlistId}/tracks`,
    {
      title: track.title,
      artist: track.artist,
      album: track.album,
      genre: track.genre,
      coverUrl: track.coverUrl,
      audioUrl: track.audioUrl,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data.track;
};

// Remove a track from a playlist
export const removeTrackFromPlaylist = async (playlistId, trackRowId) => {
  const token = await getToken();
  await axios.delete(`${API_URL}/playlists/${playlistId}/tracks/${trackRowId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Persist a new track order after a drag-and-drop reorder
export const reorderPlaylistTracks = async (playlistId, orderedIds) => {
  const token = await getToken();
  await axios.put(
    `${API_URL}/playlists/${playlistId}/tracks/reorder`,
    { orderedIds },
    { headers: { Authorization: `Bearer ${token}` } }
  );
};

// Update a playlist's details. Any field left `undefined` is left unchanged server-side.
// `coverImage`, if provided, replaces the current cover.
export const updatePlaylist = async (playlistId, { title, description, is_public, coverImage } = {}) => {
  const token = await getToken();

  const formData = new FormData();
  if (title !== undefined) formData.append('title', title);
  if (description !== undefined) formData.append('description', description ?? '');
  if (is_public !== undefined) formData.append('is_public', String(is_public));
  if (coverImage) formData.append('cover', coverImage);

  const response = await axios.put(`${API_URL}/playlists/${playlistId}`, formData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.playlist;
};

// Delete a playlist (its tracks cascade-delete on the backend)
export const deletePlaylist = async (playlistId) => {
  const token = await getToken();
  await axios.delete(`${API_URL}/playlists/${playlistId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Get playlists the current user follows (other users' public playlists)
export const getFollowedPlaylists = async () => {
  const token = await getToken();
  const response = await axios.get(`${API_URL}/playlists/followed`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.playlists;
};

// Follow another user's public playlist
export const followPlaylist = async (playlistId) => {
  const token = await getToken();
  await axios.post(`${API_URL}/playlists/${playlistId}/follow`, null, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Unfollow a playlist
export const unfollowPlaylist = async (playlistId) => {
  const token = await getToken();
  await axios.delete(`${API_URL}/playlists/${playlistId}/follow`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Search tracks only (not artists/albums), for adding songs to a playlist.
// Deliberately hits the unified /search endpoint (no `type` param) rather than
// `type=track` — that dedicated branch doesn't select cover/filename, so it can't
// resolve coverUrl/audioUrl. The unified branch does, so we filter to tracks here instead.
export const searchTracks = async (query) => {
  if (!query || query.trim().length < 2) return [];
  const response = await axios.get(`${API_URL}/auth/search`, {
    params: { q: query },
  });
  return (response.data.results || [])
    .filter(r => r.type === 'track')
    .map(r => ({
      title: r.name,
      artist: r.artist_name,
      album: r.album,
      genre: r.genre,
      coverUrl: r.coverUrl || null,
      audioUrl: r.audioUrl || null,
    }));
};

// Search everything — tracks, artists, and albums — so a user who only remembers
// the artist or album name can still find their way to a track. Mirrors the mapping
// SearchScreen.jsx's StandardSearch uses for the same unified endpoint.
export const searchAll = async (query) => {
  if (!query || query.trim().length < 2) return [];
  const response = await axios.get(`${API_URL}/auth/search`, {
    params: { q: query },
  });
  return (response.data.results || []).map(r => ({
    type: r.type,
    name: r.name,
    genre: r.genre,
    artist: r.artist_name,
    album: r.album,
    coverUrl: r.coverUrl || null,
    audioUrl: r.audioUrl || null,
  }));
};
