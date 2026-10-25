import axios from 'axios';
import { getToken } from './authService';

const API_URL = 'http://localhost:5000/api';

const authHeaders = async () => ({ Authorization: `Bearer ${await getToken()}` });

// Ask to be verified as an artist in the catalog. Returns the claim, including
// the verificationCode the artist posts on a page they control.
// { id, artistName, status, verificationCode, reviewerNote, createdAt, reviewedAt }
export const createClaim = async (artistName, evidence) => {
  const response = await axios.post(`${API_URL}/claims`, { artistName, evidence }, { headers: await authHeaders() });
  return response.data.claim;
};

// Your own claims, newest first
export const getMyClaims = async () => {
  const response = await axios.get(`${API_URL}/claims/mine`, { headers: await authHeaders() });
  return response.data.claims;
};
