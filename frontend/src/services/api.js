// frontend/src/services/api.js
import axios from 'axios';

// const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const PROD_API_URL = 'https://timeline-iota-seven.vercel.app/api';
const API_URL = process.env.NODE_ENV === 'production' ? PROD_API_URL : 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add interceptor to include auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const locationService = {
  getLocations: (bounds, year) => api.get(`/locations`, { params: { bounds, year } }),
  getLocationDetails: (id) => api.get(`/locations/${id}`),
};

export const postService = {
  getPosts: (locationId, year) => api.get(`/posts`, { params: { locationId, year } }),
  createPost: (data) => api.post(`/posts`, data),
  votePost: (postId, voteType) => api.post(`/posts/${postId}/vote`, { voteType }),
};

export const authService = {
  login: (credentials) => api.post(`/auth/login`, credentials),
  register: (userData) => api.post(`/auth/register`, userData),
};
