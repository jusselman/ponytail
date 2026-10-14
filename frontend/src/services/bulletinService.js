import axios from 'axios';
import { getToken } from './authService';

const API_URL = 'http://localhost:5000/api';

const authHeaders = async () => ({ Authorization: `Bearer ${await getToken()}` });

// Feed, newest first. Pass `before` (createdAt of the oldest post you have) for the next page.
export const getBulletinPosts = async ({ before } = {}) => {
  const response = await axios.get(`${API_URL}/bulletin/posts`, {
    headers: await authHeaders(),
    params: { before },
  });
  return response.data; // { posts, hasMore }
};

// Publish a post. `details` is the tag-specific fields object, `attachment` is
//   { type: 'track', track: { title, artist, album, genre, coverUrl, audioUrl } } or
//   { type: 'album', album: { album, artist, genre, coverUrl } },
// and `imageFile` is a File from <input type="file">. All three are optional.
export const createBulletinPost = async ({ body, tag, details, attachment, imageFile }) => {
  const formData = new FormData();
  formData.append('body', body);
  formData.append('tag', tag);
  if (details) formData.append('details', JSON.stringify(details));
  if (attachment) formData.append('attachment', JSON.stringify(attachment));
  if (imageFile) formData.append('image', imageFile);
  const response = await axios.post(`${API_URL}/bulletin/posts`, formData, {
    headers: await authHeaders(),
  });
  return response.data.post;
};

export const deleteBulletinPost = async (postId) => {
  await axios.delete(`${API_URL}/bulletin/posts/${postId}`, { headers: await authHeaders() });
};

// Like or unlike. Returns { likeCount, likedByMe }.
export const setBulletinLike = async (postId, liked) => {
  const url = `${API_URL}/bulletin/posts/${postId}/like`;
  const headers = await authHeaders();
  const response = liked
    ? await axios.post(url, null, { headers })
    : await axios.delete(url, { headers });
  return response.data;
};

// A post with its replies, oldest reply first. Returns { post, replies }.
export const getBulletinReplies = async (postId) => {
  const response = await axios.get(`${API_URL}/bulletin/posts/${postId}/replies`, {
    headers: await authHeaders(),
  });
  return response.data;
};

// Returns { reply, replyCount }
export const createBulletinReply = async (postId, body) => {
  const response = await axios.post(
    `${API_URL}/bulletin/posts/${postId}/replies`,
    { body },
    { headers: await authHeaders() }
  );
  return response.data;
};

export const deleteBulletinReply = async (replyId) => {
  await axios.delete(`${API_URL}/bulletin/replies/${replyId}`, { headers: await authHeaders() });
};

// Every track of an album, ready for the player, for album cards in posts
export const getAlbumTracks = async (artist, album) => {
  const response = await axios.get(`${API_URL}/auth/albums/detail`, { params: { artist, album } });
  return (response.data.tracks || []).map(t => ({
    title: t.title,
    artist,
    album,
    genre: response.data.genre || null,
    coverUrl: t.coverUrl || response.data.coverUrl || null,
    audioUrl: t.audioUrl,
  }));
};
