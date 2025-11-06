// backend/routes/postRoutes.js
const router = require('express').Router();
const Post = require('../models/postModel');
const mongoose = require('mongoose');
const { protect } = require('../middleware/authMiddleware');
const { generateHistoricalContext } = require('../services/aiService');
const { embedText, verifyClaim } = require('../services/aiService'); // Ensure these are imported
const HistoricalFact = require('../models/historicalFactModel');
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

// New route: POST /api/posts/:id/context
router.post('/:id/context', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ msg: 'Post not found' });
        }

        // **1. Check Cache (MongoDB)**
        if (post.ai_context && post.ai_context.length > 0) {
            return res.json({ context: post.ai_context, from_cache: true });
        }

        // **2. Generate Context (AI Call)**
        const context = await generateHistoricalContext(post.text, post.year, post.location);

        // **3. Cache Result (MongoDB Update)**
        post.ai_context = context;
        await post.save();

        res.json({ context: context, from_cache: false });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// NEW ROUTE: POST /api/posts/:id/verify-claim (RAG Fact-Checking)
router.post('/:id/verify-claim', async (req, res) => {
    try {
        const postId = req.params.id;
        // Use .select() to also pull the cached RAG verification fields
        const post = await Post.findById(postId).select('+aiVerificationResult').lean(); 
        if (!post) {
            return res.status(404).json({ msg: 'Post not found' });
        }

        // 1. Check Cache
        if (post.verificationStatus !== 'Pending' && post.aiVerificationResult) {
            return res.json({ verification: post.aiVerificationResult, from_cache: true });
        }
        
        // --- RAG STEP 1: EMBED THE USER'S CLAIM ---
        const queryText = `Context: ${post.location.name} in Year ${post.year}. Claim: ${post.content}`;
        const queryVector = await embedText(queryText);
        
        // --- RAG STEP 2: RETRIEVE FACTS VIA VECTOR SEARCH WITH FILTERING ---
        const retrievedFacts = await HistoricalFact.aggregate([
            {
                $vectorSearch: {
                    index: 'historicalVectorIndex', 
                    path: 'embedding',
                    queryVector: queryVector,
                    numCandidates: 100,
                    limit: 3,
                    
                    // 💡 COMBINED TEMPORAL AND GEOGRAPHIC PRE-FILTER 💡
                    filter: {
                        $and: [
                            // 1. Temporal Filter: Fact must cover the post's year
                            { 'yearRange.start': { $lte: post.year } }, 
                            { 'yearRange.end': { $gte: post.year } },
                            
                            // 2. Geographic Filter: Check if the post's location name is in the fact's keywords
                            { 'locationKeywords': post.location.name } // Uses $in operator implicitly for the array
                        ]
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    text: 1,
                    yearRange: 1,
                    source: 1,
                    score: { $meta: 'vectorSearchScore' }
                }
            }
        ]).exec();

        // --- RAG STEP 3: LLM GENERATION ---
        const verificationResult = await verifyClaim(post.content, post.year, post.location, retrievedFacts);
        
        // 4. Cache Result and Update Status
        const verdict = verificationResult.startsWith('VERDICT: VERIFIED') ? 'Verified' : 
                        verificationResult.startsWith('VERDICT: DISPUTED') ? 'Disputed' : 'Pending';

        await Post.findByIdAndUpdate(postId, {
            $set: {
                verificationStatus: verdict,
                aiVerificationResult: verificationResult,
            }
        });

        res.json({ verification: verificationResult, from_cache: false });

    } catch (err) {
        console.error('RAG Fact-Checking Error:', err.message);
        res.status(500).send('Server Error during RAG fact-check.');
    }
});

module.exports = router;
