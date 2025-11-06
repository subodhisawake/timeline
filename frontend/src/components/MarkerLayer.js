// frontend/src/components/MarkerLayer.js

import React, { useEffect, useState } from 'react';
import { Marker, Popup, useMap } from 'react-map-gl/maplibre';
import axios from 'axios';
import Post from './Post'; 

// Use environment variable or fallback to the deployed backend URL
const PROD_API_URL = 'https://timeline-two-chi.vercel.app/api';
const API_URL = process.env.NODE_ENV === 'production' ? PROD_API_URL : 'http://localhost:5000/api';

// Helper function to determine marker color based on verification status
const getMarkerColor = (post) => {
  // Use the state property from the post model
  const status = post.verificationStatus; 
  const isVerifiedAuthor = post.author && post.author.isVerified;

  if (status === 'Verified') {
    return '#4CAF50'; // Green for verified
  }
  if (status === 'Disputed') {
    return '#F44336'; // Red for disputed
  }
  if (isVerifiedAuthor) {
    return '#FFD700'; // Gold for verified author (default if status is Pending)
  }
  return '#FF4444'; // Default red
};

const MarkerLayer = ({ year, minZoom = 3, refresh }) => {
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const { current: map } = useMap();
  const [currentZoom, setCurrentZoom] = useState(minZoom);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ... (Existing useEffect for zoom listener - unchanged) ...
  useEffect(() => {
    if (map) {
      const updateZoom = () => {
        setCurrentZoom(map.getZoom());
      };
      
      updateZoom();
      map.on('zoom', updateZoom);
      
      return () => {
        map.off('zoom', updateZoom);
      };
    }
  }, [map]);

  // Fetch posts when year changes or refresh is triggered (unchanged)
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get(`${API_URL}/posts`, {
          params: { year }
        });
        
        const postsWithCoordinates = response.data.map(post => ({
          ...post,
          longitude: post.location.coordinates[0],
          latitude: post.location.coordinates[1]
        }));
        
        setPosts(postsWithCoordinates);
      } catch (error) {
        console.error('Error fetching posts:', error);
        setError('Failed to load historical markers');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPosts();
  }, [year, refresh]);

  // --- NEW: Universal Post Update Handler ---
  const handlePostUpdate = (updatedPost) => {
    // 1. Update the main 'posts' list with the new data 
    const updatedPosts = posts.map(p => 
      (p._id === updatedPost._id ? { 
        ...p, 
        ...updatedPost, 
        // Ensure coordinates are preserved 
        longitude: p.longitude, 
        latitude: p.latitude 
      } : p)
    );
    setPosts(updatedPosts);
    
    // 2. Update the selectedPost state so the popup instantly refreshes
    setSelectedPost(updatedPosts.find(p => p._id === updatedPost._id));
  };
  // --- END: Universal Post Update Handler ---


  if (loading) {
    return <div className="loading-indicator">Loading markers...</div>;
  }

  return (
    <>
      {currentZoom >= minZoom && posts.map(post => (
        <Marker
          key={post._id}
          longitude={post.longitude}
          latitude={post.latitude}
          anchor="bottom"
          onClick={e => {
            e.originalEvent.stopPropagation();
            setSelectedPost(post);
          }}
        >
          <div className="marker" style={{ 
            // --- NEW: Use the helper function for dynamic color ---
            backgroundColor: getMarkerColor(post),
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            border: '2px solid white',
            boxShadow: '0 0 4px rgba(0,0,0,0.5)',
            cursor: 'pointer'
          }}/>
        </Marker>
      ))}
      
      {selectedPost && (
        <Popup
          longitude={selectedPost.longitude}
          latitude={selectedPost.latitude}
          anchor="top"
          onClose={() => setSelectedPost(null)}
          closeOnClick={false}
          closeButton={true}
        >
          <div style={{ padding: '0px', maxWidth: '300px' }}>
            <Post 
              post={selectedPost} 
              onVoteUpdate={handlePostUpdate} // Pass the new universal handler
            />
          </div>
        </Popup>
      )}
    </>
  );
};

export default MarkerLayer;