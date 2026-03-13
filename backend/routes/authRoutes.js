// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
const { protect } = require('../middleware/authMiddleware');

// Generate JWT
const generateToken = (id) => {
  // console.log("JWT_SECRET value:", process.env.JWT_SECRET);
  console.log("Secret Length:", process.env.JWT_SECRET && process.env.JWT_SECRET.length);

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined");
  }

  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};


// Register user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    console.log("1. Registration started for:", email);

    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      console.log("2. User already exists");
      return res.status(400).json({ error: 'User already exists' });
    }

    console.log("3. Hashing password...");
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    console.log("4. Attempting to save user to MongoDB...");
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      isVerified: false
    });

    console.log("5. User saved! Generating token...");
    const token = generateToken(user._id);

    res.status(201).json({ _id: user._id, token });
  } catch (error) {
    console.error('!!! Registration error:', error.message);
    res.status(400).json({ error: error.message });
  }
});
// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check for user email
    const user = await User.findOne({ email });
    
    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        isVerified: user.isVerified,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get user profile
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    console.error('Profile error:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
