import axios from 'axios';
import { getToken } from './authService';

const API_URL = 'http://localhost:5000/api';

const authHeaders = async () => ({ Authorization: `Bearer ${await getToken()}` });

// A tip target is what prompted the tip:
//   { type: 'track', title, artist, album, coverUrl }
//   { type: 'playlist', playlistId, title, coverUrl }
//   { type: 'post', postId, excerpt }
const targetParams = (target) => {
  if (target.type === 'track') return { title: target.title, artist: target.artist };
  if (target.type === 'playlist') return { playlistId: target.playlistId };
  return { postId: target.postId };
};

// Who the tip would go to: { name, username, avatarUrl, isArtist, onPonytail, isYou, label }
export const getTipRecipient = async (target) => {
  const response = await axios.get(`${API_URL}/tips/recipient`, {
    headers: await authHeaders(),
    params: { type: target.type, ...targetParams(target) },
  });
  return response.data;
};

// Record a tip once the (mock) payment has succeeded.
// payment is { ref, brand, last4 } from paymentService.
export const sendTip = async ({ target, amountCents, message, anonymous, payment }) => {
  const response = await axios.post(`${API_URL}/tips`, {
    targetType: target.type,
    target: targetParams(target),
    amountCents,
    message,
    anonymous,
    payment: { ref: payment.ref, brand: payment.brand, last4: payment.last4 },
  }, { headers: await authHeaders() });
  return response.data.tip;
};

// Your tips received, private to you: { count, totalCents, netCents, tips }
export const getReceivedTips = async () => {
  const response = await axios.get(`${API_URL}/tips/received`, { headers: await authHeaders() });
  return response.data;
};
