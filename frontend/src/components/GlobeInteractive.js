// frontend/src/components/GlobeInteractive.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const GlobeInteractive = ({ year }) => {
    const [posts, setPosts] = useState([]);

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/posts', {
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
            {posts.map(post => (
                <div key={post._id}>
                    <h3>{post.location.name}</h3>
                    <p>{post.content}</p>
                    <p>Posted by: {post.author.username}</p>
                    <p>Year: {post.year}</p>
                </div>
            ))}
        </div>
    );
};

export default GlobeInteractive;
