// backend/models/postModel.js
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  location: {
    lat: Number,
    lng: Number,
    name: String
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
  media: [{
    type: String,
    url: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Post', postSchema);
