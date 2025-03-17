import React, { useEffect, useState } from 'react';
import { Marker, Popup, useMap } from 'react-map-gl/maplibre';
import axios from 'axios';

const MarkerLayer = ({ year, minZoom = 3, refresh }) => {
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const { current: map } = useMap();
  const [currentZoom, setCurrentZoom] = useState(minZoom);

  // Get current viewport from the map
  useEffect(() => {
    if (map) {
      const updateZoom = () => {
        setCurrentZoom(map.getZoom());
      };
      
      // Initial zoom level
      updateZoom();
      
      // Listen for zoom changes
      map.on('zoom', updateZoom);
      
      return () => {
        map.off('zoom', updateZoom);
      };
    }
  }, [map]);

  // Fetch posts when year changes or refresh is triggered
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        console.log('Fetching posts for year:', year);
        const response = await axios.get('http://localhost:5000/api/posts', {
          params: { year }
        });
        
        console.log('Fetched posts:', response.data);
        
        const postsWithCoordinates = response.data.map(post => ({
          ...post,
          longitude: post.location.coordinates[0],
          latitude: post.location.coordinates[1]
        }));
        
        console.log('Processed posts with coordinates:', postsWithCoordinates);
        setPosts(postsWithCoordinates);
      } catch (error) {
        console.error('Error fetching posts:', error);
      }
    };
    
    fetchPosts();
  }, [year, refresh]);

  // Debug info
  console.log('Current zoom:', currentZoom, 'Min zoom:', minZoom);
  console.log('Should show markers:', currentZoom >= minZoom);
  console.log('Number of posts:', posts.length);

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
            backgroundColor: post.author && post.author.isVerified ? '#ffd700' : '#ff4444',
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
          <div style={{ padding: '5px' }}>
            <h3 style={{ margin: '0 0 5px 0' }}>{selectedPost.location.name}</h3>
            <p style={{ margin: '5px 0' }}>{selectedPost.content}</p>
            <p style={{ margin: '5px 0', fontSize: '0.9em', color: '#666' }}>
              Year: {selectedPost.year}
            </p>
            <p style={{ margin: '5px 0', fontSize: '0.9em', color: '#666' }}>
              By: {selectedPost.author ? selectedPost.author.username : 'Unknown'}
            </p>
          </div>
        </Popup>
      )}
    </>
  );
};

export default MarkerLayer;
