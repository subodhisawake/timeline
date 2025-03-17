// src/context/AuthContext.js
import { createContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

// Use environment variable or fallback to the deployed backend URL
const API_URL = process.env.REACT_APP_API_URL || 'https://timeline-two-chi.vercel.app/api';
// Fallback to localhost for local development if needed
const BASE_URL = process.env.NODE_ENV === 'production' ? API_URL : 'http://localhost:5000/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // Register user
  const register = async (userData) => {
    try {
      const response = await axios.post(`${BASE_URL}/auth/register`, userData);
      if (response.data) {
        localStorage.setItem('user', JSON.stringify(response.data));
        setUser(response.data);
      }
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error.response?.data?.error || 'Registration failed';
    }
  };

  // Login user
  const login = async (userData) => {
    try {
      const response = await axios.post(`${BASE_URL}/auth/login`, userData);
      if (response.data) {
        localStorage.setItem('user', JSON.stringify(response.data));
        setUser(response.data);
      }
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error.response?.data?.error || 'Login failed';
    }
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
