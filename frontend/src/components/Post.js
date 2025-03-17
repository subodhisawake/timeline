// frontend/src/components/Post.js
import { useState, useContext } from 'react';
import { Card, CardContent, Typography, Box, IconButton } from '@mui/material';
import { ThumbUp, ThumbDown } from '@mui/icons-material';
import axios from 'axios';
import AuthContext from '../context/AuthContext';

// Use environment variable or fallback to the deployed backend URL
const PROD_API_URL = 'https://timeline-two-chi.vercel.app/api';
const API_URL = process.env.NODE_ENV === 'production' ? PROD_API_URL : 'http://localhost:5000/api';

const Post = ({ post, onVoteUpdate }) => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Check if user has voted on this post
  const userVote = post.userVotes?.find(
    vote => vote.user === user?._id
  )?.voteType;
  
  const handleVote = async (voteType) => {
    if (!user) {
      alert('Please log in to vote');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.post(
        `${API_URL}/posts/${post._id}/vote`,
        { voteType },
        {
          headers: {
            Authorization: `Bearer ${user.token}`
          }
        }
      );
      
      if (onVoteUpdate) {
        onVoteUpdate(response.data);
      }
    } catch (error) {
      console.error('Voting error:', error);
      setError('Failed to register vote. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6">{post.location?.name || 'Unknown Location'}</Typography>
        <Typography variant="body1">{post.content}</Typography>
        <Typography variant="caption" color="text.secondary">
          Year: {post.year} | Posted by: {post.author?.username || 'Anonymous'}
          {post.author?.isVerified && ' ✓'}
        </Typography>
        
        {error && (
          <Typography color="error" variant="caption" sx={{ display: 'block', mt: 1 }}>
            {error}
          </Typography>
        )}
        
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
          <IconButton 
            onClick={() => handleVote('up')}
            color={userVote === 'up' ? 'primary' : 'default'}
            disabled={loading}
          >
            <ThumbUp />
          </IconButton>
          <Typography>{post.votes?.up || 0}</Typography>
          
          <IconButton 
            onClick={() => handleVote('down')}
            color={userVote === 'down' ? 'error' : 'default'}
            disabled={loading}
            sx={{ ml: 1 }}
          >
            <ThumbDown />
          </IconButton>
          <Typography>{post.votes?.down || 0}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default Post;
