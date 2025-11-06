// frontend/src/components/Post.js
import { useState, useContext } from 'react';
import { Card, CardContent, Typography, Box, IconButton, Button, CircularProgress } from '@mui/material';
import { ThumbUp, ThumbDown, Gavel, CheckCircleOutline, Cancel } from '@mui/icons-material'; // Added icons
import axios from 'axios';
import AuthContext from '../context/AuthContext';

// Use environment variable or fallback to the deployed backend URL
const PROD_API_URL = 'https://timeline-api-7aj8.onrender.com/api';
const API_URL = process.env.NODE_ENV === 'production' ? PROD_API_URL : 'http://localhost:5000/api';

const Post = ({ post, onVoteUpdate }) => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // --- START: AI Context State ---
  const [aiContext, setAiContext] = useState(post.aiContext || '');
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState(null);
  // --- END: AI Context State ---

  // --- START: AI Verification (RAG) State ---
  // Initialize with values from the post model (VerificationStatus and Result)
  const [verificationStatus, setVerificationStatus] = useState(post.verificationStatus || 'Pending');
  const [verificationResult, setVerificationResult] = useState(post.aiVerificationResult || '');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState(null);
  // --- END: AI Verification (RAG) State ---
  
  // Check if user has voted on this post
  const userVote = post.userVotes?.find(
    vote => vote.user === user?._id
  )?.voteType;
  
  // HandleVote function 
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

  // handleGetContext function
  const handleGetContext = async () => {
    if (aiContext) return; 
    
    try {
      setContextLoading(true);
      setContextError(null);
      
      const response = await axios.post(`${API_URL}/posts/${post._id}/context`);
      
      setAiContext(response.data.context);
      
    } catch (error) {
      console.error('AI Context error:', error);
      setContextError(error.response?.data?.msg || 'Failed to retrieve AI context.');
    } finally {
      setContextLoading(false);
    }
  };

  // --- START: RAG Fact-Check Handler ---
  const handleVerifyClaim = async () => {
    // Only run if the status is Pending
    if (verificationStatus !== 'Pending') return; 

    setVerifyLoading(true);
    setVerifyError(null);
    
    try {
      // Call the RAG Express route: POST /api/posts/:id/verify-claim
      const response = await axios.post(`${API_URL}/posts/${post._id}/verify-claim`);
      
      const resultText = response.data.verification;
      setVerificationResult(resultText);

      // Determine new status from the result text (based on the backend's logic)
      let newStatus = 'Pending';
      if (resultText.startsWith('VERDICT: VERIFIED')) {
        newStatus = 'Verified';
      } else if (resultText.startsWith('VERDICT: DISPUTED')) {
        newStatus = 'Disputed';
      } else if (resultText.startsWith('VERDICT: INSUFFICIENT DATA')) {
        newStatus = 'Pending'; // Keep pending or mark as 'Unverified'
      }
      setVerificationStatus(newStatus);

      // Notify parent component (MarkerLayer) of the update
      if (onVoteUpdate) {
        onVoteUpdate({...post, verificationStatus: newStatus, aiVerificationResult: resultText});
      }

    } catch (error) {
      console.error('RAG Fact-Check error:', error);
      setVerifyError('Failed to run fact check. Check server logs.');
    } finally {
      setVerifyLoading(false);
    }
  };
  // --- END: RAG Fact-Check Handler ---

  // Helper function for visual flair
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'Verified':
        return { icon: <CheckCircleOutline color="success" />, color: 'success.main', text: 'VERIFIED by AI RAG' };
      case 'Disputed':
        return { icon: <Cancel color="error" />, color: 'error.main', text: 'DISPUTED by AI RAG' };
      case 'Pending':
      default:
        return { icon: <Gavel color="action" />, color: 'text.secondary', text: 'Pending Verification' };
    }
  };

  const statusDisplay = getStatusDisplay(verificationStatus);
  
  return (
    <Card sx={{ mb: 2, minWidth: 280 }}>
      <CardContent>
        <Typography variant="h6">{post.location?.name || 'Unknown Location'}</Typography>
        <Typography variant="body1">{post.content}</Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            {statusDisplay.icon}
            <Typography variant="subtitle2" sx={{ ml: 1, color: statusDisplay.color, fontWeight: 'bold' }}>
                {statusDisplay.text}
            </Typography>
        </Box>
        
        <Typography variant="caption" color="text.secondary">
          Year: {post.year} | Posted by: {post.author?.username || 'Anonymous'}
          {post.author?.isVerified && ' ✓'}
        </Typography>
        
        {/* Error Displays (Vote/Context/Verify) */}
        {error && <Typography color="error" variant="caption" sx={{ display: 'block', mt: 1 }}>{error}</Typography>}
        {contextError && <Typography color="error" variant="caption" sx={{ display: 'block', mt: 1 }}>{contextError}</Typography>}
        {verifyError && <Typography color="error" variant="caption" sx={{ display: 'block', mt: 1 }}>{verifyError}</Typography>}
        
        {/* Vote Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, pb: 1, borderBottom: '1px solid #eee' }}>
          <IconButton onClick={() => handleVote('up')} color={userVote === 'up' ? 'primary' : 'default'} disabled={loading}><ThumbUp /></IconButton>
          <Typography>{post.votes?.up || 0}</Typography>
          <IconButton onClick={() => handleVote('down')} color={userVote === 'down' ? 'error' : 'default'} disabled={loading} sx={{ ml: 1 }}><ThumbDown /></IconButton>
          <Typography>{post.votes?.down || 0}</Typography>
        </Box>

        {/* --- AI Context Display --- */}
        <Box sx={{ mt: 2 }}>
          {aiContext ? (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>AI Historical Context:</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{aiContext}</Typography>
            </Box>
          ) : (
            <Button variant="outlined" size="small" onClick={handleGetContext} disabled={contextLoading} startIcon={contextLoading ? <CircularProgress size={16} /> : null}>
              {contextLoading ? 'Generating Context...' : 'Get AI Context'}
            </Button>
          )}
        </Box>
        {/* --- END: AI Context Display --- */}

        {/* --- START: AI RAG Verification Controls/Display --- */}
        <Box sx={{ mt: 2, pt: 1, borderTop: '1px dashed #eee' }}>
            {/* Fact Check Button (Visible only if Pending) */}
            {verificationStatus === 'Pending' && (
                <Button 
                    variant="contained"
                    size="small"
                    onClick={handleVerifyClaim}
                    disabled={verifyLoading}
                    startIcon={verifyLoading ? <CircularProgress size={16} /> : <Gavel />}
                >
                    {verifyLoading ? 'Fact-Checking Claim...' : 'Fact Check This Claim (RAG)'}
                </Button>
            )}

            {/* Display the detailed AI RAG Verification response */}
            {verificationResult && (
                <Box sx={{ borderLeft: '3px solid', borderColor: statusDisplay.color, pl: 1, mt: 1 }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {verificationResult}
                    </Typography>
                </Box>
            )}
        </Box>
        {/* --- END: AI RAG Verification Controls/Display --- */}
      </CardContent>
    </Card>
  );
};

export default Post;