// src/components/MapPostForm.js
import React, { useState, useContext } from 'react';
import { 
  Card, 
  CardContent, 
  TextField, 
  Button, 
  Typography, 
  Box, 
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import axios from 'axios';
import AuthContext from '../context/AuthContext';

// Login Form Component
const LoginForm = ({ onClose, onSuccess }) => {
  const { login } = useContext(AuthContext);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await login(formData);
      if (onSuccess) onSuccess();
    } catch (error) {
      setError(typeof error === 'string' ? error : 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <TextField
        margin="normal"
        required
        fullWidth
        id="email"
        label="Email Address"
        name="email"
        autoComplete="email"
        value={formData.email}
        onChange={handleChange}
        disabled={loading}
      />
      
      <TextField
        margin="normal"
        required
        fullWidth
        name="password"
        label="Password"
        type="password"
        id="password"
        autoComplete="current-password"
        value={formData.password}
        onChange={handleChange}
        disabled={loading}
      />
      
      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 2 }}
        disabled={loading}
      >
        {loading ? <CircularProgress size={24} /> : 'Sign In'}
      </Button>
    </Box>
  );
};

// Register Form Component
const RegisterForm = ({ onClose, onSuccess }) => {
  const { register } = useContext(AuthContext);
  const [formData, setFormData] = useState({ 
    username: '', 
    email: '', 
    password: '', 
    confirmPassword: '' 
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    
    try {
      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password
      });
      if (onSuccess) onSuccess();
    } catch (error) {
      setError(typeof error === 'string' ? error : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <TextField
        margin="normal"
        required
        fullWidth
        id="username"
        label="Username"
        name="username"
        autoComplete="username"
        value={formData.username}
        onChange={handleChange}
        disabled={loading}
      />
      
      <TextField
        margin="normal"
        required
        fullWidth
        id="email"
        label="Email Address"
        name="email"
        autoComplete="email"
        value={formData.email}
        onChange={handleChange}
        disabled={loading}
      />
      
      <TextField
        margin="normal"
        required
        fullWidth
        name="password"
        label="Password"
        type="password"
        id="password"
        value={formData.password}
        onChange={handleChange}
        disabled={loading}
      />
      
      <TextField
        margin="normal"
        required
        fullWidth
        name="confirmPassword"
        label="Confirm Password"
        type="password"
        id="confirmPassword"
        value={formData.confirmPassword}
        onChange={handleChange}
        disabled={loading}
      />
      
      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 2 }}
        disabled={loading}
      >
        {loading ? <CircularProgress size={24} /> : 'Register'}
      </Button>
    </Box>
  );
};

// Main MapPostForm Component
const MapPostForm = ({ location, year, onClose, onSubmit }) => {
  const { user } = useContext(AuthContext);
  const [content, setContent] = useState('');
  const [locationName, setLocationName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authMode, setAuthMode] = useState(null); // 'login' or 'register'

  const handleSubmitPost = async () => {
    if (!user) {
      setError('Please log in to create a post');
      return;
    }

    if (!content.trim() || !locationName.trim()) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const postData = {
        content,
        location: {
          type: "Point",
          coordinates: [location.lng, location.lat],
          name: locationName
        },
        year
      };
      
      const response = await axios.post(
        'http://localhost:5000/api/posts', 
        postData,
        {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        }
      );
      
      console.log('Post created:', response.data);
      
      if (onSubmit) {
        onSubmit(response.data);
      }
      
      onClose();
    } catch (error) {
      console.error('Error creating post:', error);
      setError(error.response?.data?.error || 'Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = () => {
    setAuthMode(null);
  };

  if (!user) {
    return (
      <Card sx={{ 
        position: 'absolute', 
        top: '50%', 
        left: '50%', 
        transform: 'translate(-50%, -50%)',
        width: 400,
        maxWidth: '90vw',
        zIndex: 1000,
        boxShadow: 3
      }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Authentication Required
          </Typography>
          <Alert severity="warning" sx={{ mb: 2 }}>
            You need to be logged in to create posts.
          </Alert>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 3, mb: 2 }}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => setAuthMode('login')}
            >
              Login
            </Button>
            <Button 
              variant="outlined" 
              color="primary" 
              onClick={() => setAuthMode('register')}
            >
              Register
            </Button>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button onClick={onClose} variant="text">
              Close
            </Button>
          </Box>
        </CardContent>

        {/* Login Dialog */}
        <Dialog open={authMode === 'login'} onClose={() => setAuthMode(null)}>
          <DialogTitle>Login to Your Account</DialogTitle>
          <DialogContent>
            <LoginForm onSuccess={handleAuthSuccess} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAuthMode(null)}>Cancel</Button>
            <Button onClick={() => setAuthMode('register')}>Need an account? Register</Button>
          </DialogActions>
        </Dialog>

        {/* Register Dialog */}
        <Dialog open={authMode === 'register'} onClose={() => setAuthMode(null)}>
          <DialogTitle>Create an Account</DialogTitle>
          <DialogContent>
            <RegisterForm onSuccess={handleAuthSuccess} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAuthMode(null)}>Cancel</Button>
            <Button onClick={() => setAuthMode('login')}>Already have an account? Login</Button>
          </DialogActions>
        </Dialog>
      </Card>
    );
  }

  return (
    <Card sx={{ 
      position: 'absolute', 
      top: '50%', 
      left: '50%', 
      transform: 'translate(-50%, -50%)',
      width: 400,
      maxWidth: '90vw',
      zIndex: 1000,
      boxShadow: 3
    }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Create New Historical Post
        </Typography>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Year: {year} | Coordinates: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
        </Typography>
        
        <Box sx={{ mb: 2, mt: 2 }}>
          <TextField
            label="Location Name"
            fullWidth
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            margin="normal"
            variant="outlined"
            placeholder="e.g., Rome, Colosseum, etc."
            disabled={loading}
          />
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <TextField
            label="Historical Information"
            multiline
            rows={4}
            fullWidth
            value={content}
            onChange={(e) => setContent(e.target.value)}
            margin="normal"
            variant="outlined"
            placeholder="Share historical information about this location..."
            disabled={loading}
          />
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary" sx={{ mr: 'auto' }}>
            Posting as: {user.username}
          </Typography>
          <Button onClick={onClose} variant="outlined" disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmitPost} 
            variant="contained" 
            disabled={loading || !content.trim() || !locationName.trim()}
          >
            {loading ? <CircularProgress size={24} /> : 'Post'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default MapPostForm;
