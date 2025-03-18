// src/services/api.js
import axios from 'axios';

// Use environment variable for API URL
const PROD_API_URL = 'https://timeline-two-chi.vercel.app/api'; // Deployed backend URL
const API_URL = process.env.NODE_ENV === 'production' ? PROD_API_URL : 'http://localhost:5000/api'; // Fallback to localhost if in development

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add interceptor to include auth token if it exists
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
