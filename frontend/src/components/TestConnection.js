// frontend/src/components/TestConnection.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';

// Use environment variable or fallback to the deployed backend URL
const PROD_API_URL = 'https://timeline-two-chi.vercel.app/api';
const API_URL = process.env.NODE_ENV === 'production' ? PROD_API_URL : 'http://localhost:5000/api';

const TestConnection = () => {
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [environment, setEnvironment] = useState('');

    useEffect(() => {
        const testConnection = async () => {
            try {
                setLoading(true);
                setEnvironment(process.env.NODE_ENV || 'development');
                
                console.log('Testing connection to:', `${API_URL}/test`);
                const response = await axios.get(`${API_URL}/test`);
                
                setMessage(response.data.message);
                console.log('Backend Response:', response.data);
            } catch (err) {
                setError('Connection failed: ' + (err.response?.data?.message || err.message));
                console.error('Connection Error:', err);
            } finally {
                setLoading(false);
            }
        };

        testConnection();
    }, []);

    return (
        <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '5px', maxWidth: '600px', margin: '20px auto' }}>
            <h3>Backend Connection Test</h3>
            <p>Environment: <strong>{environment}</strong></p>
            <p>API URL: <code>{API_URL}/test</code></p>
            
            {loading && <p>Testing connection...</p>}
            
            {message && !loading && (
                <p style={{color: 'green', padding: '10px', background: '#f0fff0', borderRadius: '4px'}}>
                    ✅ Success: {message}
                </p>
            )}
            
            {error && !loading && (
                <p style={{color: 'red', padding: '10px', background: '#fff0f0', borderRadius: '4px'}}>
                    ❌ Error: {error}
                </p>
            )}
        </div>
    );
};

export default TestConnection;
