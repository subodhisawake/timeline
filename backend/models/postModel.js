// backend/models/postModel.js
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true
        },
        name: String // The human-readable name of the location (e.g., "Rome")
    },
    year: {
        type: Number,
        required: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    votes: {
        up: { type: Number, default: 0 },
        down: { type: Number, default: 0 }
    },
    userVotes: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        voteType: {
            type: String,
            enum: ['up', 'down']
        }
    }],
    media: [{
        type: String,
        url: String
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    // --- START: AI Feature Additions ---
    aiContext: {
        type: String, // Field to store the AI-generated historical context
        default: '' // Default to empty string
    },
    verificationStatus: {
        type: String,
        enum: ['Pending', 'Verified', 'Disputed', 'Not Applicable'], // Status for future fact-checking
        default: 'Pending'
    }
    // --- END: AI Feature Additions ---
});

// Create a 2dsphere index on the location field
postSchema.index({ 'location.coordinates': '2dsphere' });

module.exports = mongoose.model('Post', postSchema);