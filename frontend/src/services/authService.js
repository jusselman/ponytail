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