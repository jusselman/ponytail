import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Places API — backs Discovery's Place filter and the musician onboarding
// city picker. See backend/src/routes/placesRoutes.js. ──
const API_URL = 'http://localhost:5000/api/places';

const authHeaders = async () => {
  const token = await AsyncStorage.getItem('ponytail_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const genreParam = (genres) => (genres && genres.length ? genres.join(',') : undefined);

// Cities only, no login needed (used before the account exists)
export const searchCities = async (q) => {
  const res = await axios.get(`${API_URL}/cities`, { params: { q } });
  return res.data.cities || [];
};

// Places + located musicians, with track counts for the selected genres
export const searchPlaces = async (q, genres) => {
  const res = await axios.get(`${API_URL}/search`, {
    params: { q, genres: genreParam(genres) },
    headers: await authHeaders(),
  });
  return { places: res.data.places || [], musicians: res.data.musicians || [] };
};

// Home city, near-me radius counts and scene tiles for the selected genres
export const getPlaceOptions = async (genres) => {
  const res = await axios.get(`${API_URL}/options`, {
    params: { genres: genreParam(genres) },
    headers: await authHeaders(),
  });
  return res.data;
};

// Save the listener's home city (what "Near me" measures from)
export const setHomeCity = async (placeId) => {
  const res = await axios.put(`${API_URL}/home`, { placeId }, { headers: await authHeaders() });
  return res.data.home;
};
