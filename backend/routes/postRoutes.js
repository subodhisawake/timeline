// backend/routes/postRoutes.js
const router = require('express').Router();
const Post = require('../models/postModel');

// Get all posts for a specific location and year
router.get('/', async (req, res) => {
    try {
        const { lat, lng, year } = req.query;
        const posts = await Post.find({
            'location.lat': { $near: parseFloat(lat) },
            'location.lng': { $near: parseFloat(lng) },
            year: parseInt(year)
        }).populate('author', 'username isVerified');
        res.json(posts);
    } catch (err) {
        res.status(400).json('Error: ' + err);
    }
});

// Get a single post
router.get('/:id', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate('author', 'username isVerified');
        res.json(post);
    } catch (err) {
        res.status(400).json('Error: ' + err);
    }
});

module.exports = router;
