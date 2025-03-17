
import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Use environment variable or fallback to the deployed backend URL
const PROD_API_URL = 'https://timeline-two-chi.vercel.app/api';
const API_URL = process.env.NODE_ENV === 'production' ? PROD_API_URL : 'http://localhost:5000/api';

const GlobeInteractive = ({ year }) => {
    const [posts, setPosts] = useState([]);

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const response = await axios.get(`${API_URL}/posts`, {
                    params: {
                        year: year
                    }
                });
                setPosts(response.data);
                console.log('Fetched posts:', response.data);
            } catch (err) {
                console.error('Error fetching posts:', err);
            }
        };

        fetchPosts();
    }, [year]);

    return (
        <div>
            {posts.length > 0 ? (
                posts.map(post => (
                    <div key={post._id}>
                        <h3>{post.location.name}</h3>
                        <p>{post.content}</p>
                        <p>Posted by: {post.author?.username || 'Anonymous'}</p>
                        <p>Year: {post.year}</p>
                    </div>
                ))
            ) : (
                <p>No historical posts found for year {year}.</p>
            )}
        </div>
    );
};

export default GlobeInteractive;
