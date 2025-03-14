// backend/test-post.js
const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const Post = require('./models/postModel');
const User = require('./models/userModel');

async function createTestPost() {
  try {
    // Find a user to associate with the post
    const user = await User.findOne();
    
    if (!user) {
      console.error('No user found. Please create a user first.');
      return;
    }

    // Create a post with proper GeoJSON format
    const newPost = new Post({
      content: "Ancient Roman settlement discovered here in 125 CE",
      location: {
        type: "Point",
        coordinates: [12.4964, 41.9028], // [longitude, latitude]
        name: "Rome"
      },
      year: 125,
      author: user._id,
      votes: {
        up: 5,
        down: 1
      }
    });

    const savedPost = await newPost.save();
    console.log('Post created successfully:', savedPost);
  } catch (error) {
    console.error('Error creating post:', error);
  } finally {
    mongoose.connection.close();
  }
}

createTestPost();
