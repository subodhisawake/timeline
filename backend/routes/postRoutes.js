// backend/routes/postRoutes.js
const router = require('express').Router();
const Post = require('../models/postModel');
const mongoose = require('mongoose');
const { protect } = require('../middleware/authMiddleware');

// Get all posts with optional filtering
router.get('/', async (req, res) => {
    try {
        const { year, lat, lng, radius } = req.query;
        let query = {};
        
        // Add year filter if provided
        if (year) {
            query.year = parseInt(year);
        }
        
        // Add location filter if coordinates provided
        if (lat && lng) {
            // Note: This requires a geospatial index on the location field
            query['location'] = {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(lng), parseFloat(lat)]
                    },
                    $maxDistance: radius ? parseInt(radius) : 100000 // Default 100km
                }
            };
        }
        
        console.log('Query:', query);
        const posts = await Post.find(query)
            .populate('author', 'username isVerified')
            .sort({ createdAt: -1 });
            
        console.log(`Found ${posts.length} posts`);
        res.json(posts);
    } catch (err) {
        console.error('Error fetching posts:', err);
        res.status(400).json({ error: err.message });
    }
});

// Get a single post
router.get('/:id', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate('author', 'username isVerified');
            
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        res.json(post);
    } catch (err) {
        console.error('Error fetching post:', err);
        res.status(400).json({ error: err.message });
    }
});

// Create a new post (protected)
router.post('/', protect, async (req, res) => {
    try {
        const { content, location, year, media } = req.body;
        
        if (!content || !location || !year) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const newPost = new Post({
            content,
            location,
            year,
            author: req.user._id, // Use authenticated user's ID
            media: media || [],
            votes: { up: 0, down: 0 },
            userVotes: [], // Initialize empty userVotes array
            createdAt: new Date()
        });
        
        const savedPost = await newPost.save();
        
        // Populate author info before returning
        const populatedPost = await Post.findById(savedPost._id)
            .populate('author', 'username isVerified');
        
        res.status(201).json(populatedPost);
    } catch (err) {
        console.error('Error creating post:', err);
        res.status(400).json({ error: err.message });
    }
});

// Update a post (protected)
router.put('/:id', protect, async (req, res) => {
    try {
        const { content, location, year, media } = req.body;
        const postId = req.params.id;
        
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        // Check if user is the author of the post
        if (post.author.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Not authorized to update this post' });
        }
        
        // Update fields if provided
        if (content) post.content = content;
        if (location) post.location = location;
        if (year) post.year = year;
        if (media) post.media = media;
        
        const updatedPost = await post.save();
        
        // Populate author info before returning
        const populatedPost = await Post.findById(updatedPost._id)
            .populate('author', 'username isVerified');
            
        res.json(populatedPost);
    } catch (err) {
        console.error('Error updating post:', err);
        res.status(400).json({ error: err.message });
    }
});

// Delete a post (protected)
router.delete('/:id', protect, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        // Check if user is the author of the post
        if (post.author.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Not authorized to delete this post' });
        }
        
        await Post.findByIdAndDelete(req.params.id);
        res.json({ message: 'Post deleted successfully' });
    } catch (err) {
        console.error('Error deleting post:', err);
        res.status(400).json({ error: err.message });
    }
});

// Vote on a post (protected)
router.post('/:id/vote', protect, async (req, res) => {
    try {
        const { voteType } = req.body;
        const postId = req.params.id;
        const userId = req.user._id;
        
        if (voteType !== 'up' && voteType !== 'down') {
            return res.status(400).json({ error: 'Invalid vote type' });
        }
        
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        // Initialize userVotes array if it doesn't exist
        if (!post.userVotes) {
            post.userVotes = [];
        }
        
        // Check if user has already voted
        const userVoteIndex = post.userVotes.findIndex(
            vote => vote.user.toString() === userId.toString()
        );
        
        if (userVoteIndex > -1) {
            // User has already voted
            const previousVote = post.userVotes[userVoteIndex].voteType;
            
            if (previousVote === voteType) {
                // Remove vote if clicking the same button
                post.votes[previousVote] -= 1;
                post.userVotes.splice(userVoteIndex, 1);
            } else {
                // Change vote
                post.votes[previousVote] -= 1;
                post.votes[voteType] += 1;
                post.userVotes[userVoteIndex].voteType = voteType;
            }
        } else {
            // New vote
            post.votes[voteType] += 1;
            post.userVotes.push({ user: userId, voteType });
        }
        
        const updatedPost = await post.save();
        
        // Populate author info before returning
        const populatedPost = await Post.findById(updatedPost._id)
            .populate('author', 'username isVerified');
            
        res.json(populatedPost);
    } catch (err) {
        console.error('Error voting on post:', err);
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
