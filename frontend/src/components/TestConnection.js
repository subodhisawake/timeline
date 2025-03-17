// frontend/src/components/TestConnection.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const TestConnection = () => {
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const testConnection = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/test');
                setMessage(response.data.message);
                console.log('Backend Response:', response.data);
            } catch (err) {
                setError('Connection failed: ' + err.message);
                console.error('Connection Error:', err);
            }
        };

        testConnection();
    }, []);

    return (
        <div style={{ padding: '20px' }}>
            <h3>Backend Connection Test:</h3>
            {message && <p style={{color: 'green'}}>✅ Success: {message}</p>}
            {error && <p style={{color: 'red'}}>❌ Error: {error}</p>}
        </div>
    );
};

export default TestConnection;
