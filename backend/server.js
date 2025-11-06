require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

console.log("JWT_SECRET loaded:", process.env.JWT_SECRET ? "Yes" : "No");
const app = express();
const port = process.env.PORT || 5000;

// --- START: Permanent CORS Fix ---
const allowedDomains = [
    'http://localhost:3000',
    'https://timeline-api-7aj8.onrender.com',
    'https://timeline-nine-phi.vercel.app', 
];

const VERCEL_REGEX = /\.vercel\.app$/;

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps)
        if (!origin) return callback(null, true);
        
        // 1. Check explicit list
        if (allowedDomains.includes(origin)) {
            return callback(null, true);
        }
        
        // 2. Check Vercel dynamic domain pattern
        if (VERCEL_REGEX.test(origin)) {
            return callback(null, true);
        }
        
        // Deny all others
        callback(new Error(`CORS policy blocked access from: ${origin}`));
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
};

app.use(cors(corsOptions));
// --- END: Permanent CORS Fix ---

app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

const connection = mongoose.connection;
connection.once('open', () => {
    console.log("MongoDB database connection established successfully");
});

// Import and use routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes');

app.use('/api/posts', postRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Something broke!',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
    });
});

// Handle 404 routes
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});