/**
 * backend/mcp/server.js
 *
 * Timeline MCP Server — HTTP/SSE transport, mounted inside the existing Express app.
 * 
 * Endpoints (added to Express by server.js):
 *   GET  /mcp        — SSE stream (client connects here to receive messages)
 *   POST /mcp        — JSON-RPC messages from the client
 *   DELETE /mcp      — Client disconnect
 *
 * C Desktop config:
 *   {
 *     "mcpServers": {
 *       "timeline": {
 *         "type": "sse",
 *         "url": "https://timeline-api-7aj8.onrender.com/mcp"
 *       }
 *     }
 *   }
 */

const { McpServer }           = require('@modelcontextprotocol/sdk/server/mcp.js');
const { SSEServerTransport }  = require('@modelcontextprotocol/sdk/server/sse.js');
const { z }                   = require('zod');
const jwt                     = require('jsonwebtoken');

const Post            = require('../models/postModel');
const HistoricalFact  = require('../models/historicalFactModel');
const User            = require('../models/userModel');
const { generateHistoricalContext, embedText, verifyClaim } = require('../services/aiService');

// ── Auth helper ───────────────────────────────────────────────────────────────
function verifyToken(token) {
    if (!token) throw new Error('No auth token provided. Pass your JWT as the "token" argument.');
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        throw new Error('Invalid or expired auth token.');
    }
}

// ── Build the MCP server instance ─────────────────────────────────────────────
function createMcpServer() {
    const server = new McpServer({
        name: 'timeline-server',
        version: '1.0.0',
    });

    // ── get_posts ──────────────────────────────────────────────────────────────
    server.tool(
        'get_posts',
        'Fetch historical posts from the Timeline database. Filter by year, coordinates, and radius.',
        {
            year:   z.number().optional().describe('Filter by exact year, e.g. 125'),
            lat:    z.number().optional().describe('Latitude for geo filter'),
            lng:    z.number().optional().describe('Longitude for geo filter'),
            radius: z.number().optional().describe('Search radius in metres (default 100000)'),
            limit:  z.number().optional().default(20).describe('Max results (default 20)'),
        },
        async ({ year, lat, lng, radius, limit }) => {
            const query = {};
            if (year != null) query.year = year;
            if (lat != null && lng != null) {
                query.location = {
                    $near: {
                        $geometry: { type: 'Point', coordinates: [lng, lat] },
                        $maxDistance: radius ?? 100000,
                    },
                };
            }
            const posts = await Post.find(query)
                .populate('author', 'username isVerified')
                .sort({ createdAt: -1 })
                .limit(limit)
                .lean();

            return {
                content: [{ type: 'text', text: JSON.stringify({ count: posts.length, posts }, null, 2) }],
            };
        }
    );

    // ── get_post ───────────────────────────────────────────────────────────────
    server.tool(
        'get_post',
        'Fetch a single Timeline post by its MongoDB ObjectId.',
        {
            id: z.string().describe('MongoDB ObjectId of the post'),
        },
        async ({ id }) => {
            const post = await Post.findById(id)
                .populate('author', 'username isVerified')
                .lean();
            if (!post) {
                return { content: [{ type: 'text', text: 'Post not found.' }], isError: true };
            }
            return { content: [{ type: 'text', text: JSON.stringify(post, null, 2) }] };
        }
    );

    // ── create_post ────────────────────────────────────────────────────────────
    server.tool(
        'create_post',
        'Create a new historical post on the Timeline map. Requires a valid JWT token.',
        {
            token:        z.string().describe('JWT auth token (from /api/auth/login)'),
            content:      z.string().describe('Historical content to post'),
            locationName: z.string().describe('Human-readable location name, e.g. "Rome"'),
            lat:          z.number().describe('Latitude'),
            lng:          z.number().describe('Longitude'),
            year:         z.number().describe('Historical year for this post'),
        },
        async ({ token, content, locationName, lat, lng, year }) => {
            const { id } = verifyToken(token);
            const post = await Post.create({
                content,
                location: { type: 'Point', coordinates: [lng, lat], name: locationName },
                year,
                author: id,
                votes: { up: 0, down: 0 },
                userVotes: [],
            });
            const populated = await Post.findById(post._id)
                .populate('author', 'username isVerified')
                .lean();
            return { content: [{ type: 'text', text: JSON.stringify(populated, null, 2) }] };
        }
    );

    // ── vote_post ──────────────────────────────────────────────────────────────
    server.tool(
        'vote_post',
        'Up or downvote a Timeline post. Voting the same direction twice removes the vote.',
        {
            token:    z.string().describe('JWT auth token'),
            postId:   z.string().describe('MongoDB ObjectId of the post'),
            voteType: z.enum(['up', 'down']).describe('"up" or "down"'),
        },
        async ({ token, postId, voteType }) => {
            const { id: userId } = verifyToken(token);
            const post = await Post.findById(postId);
            if (!post) {
                return { content: [{ type: 'text', text: 'Post not found.' }], isError: true };
            }

            const idx = post.userVotes.findIndex(v => v.user.toString() === userId);
            if (idx > -1) {
                const prev = post.userVotes[idx].voteType;
                if (prev === voteType) {
                    post.votes[prev] -= 1;
                    post.userVotes.splice(idx, 1);
                } else {
                    post.votes[prev] -= 1;
                    post.votes[voteType] += 1;
                    post.userVotes[idx].voteType = voteType;
                }
            } else {
                post.votes[voteType] += 1;
                post.userVotes.push({ user: userId, voteType });
            }

            await post.save();
            const updated = await Post.findById(postId)
                .populate('author', 'username isVerified')
                .lean();
            return { content: [{ type: 'text', text: JSON.stringify(updated, null, 2) }] };
        }
    );

    // ── get_ai_context ─────────────────────────────────────────────────────────
    server.tool(
        'get_ai_context',
        'Generate (or retrieve cached) AI historical context for a post using Gemini.',
        {
            postId: z.string().describe('MongoDB ObjectId of the post'),
        },
        async ({ postId }) => {
            const post = await Post.findById(postId);
            if (!post) {
                return { content: [{ type: 'text', text: 'Post not found.' }], isError: true };
            }
            if (post.aiContext?.length > 0) {
                return {
                    content: [{ type: 'text', text: JSON.stringify({ context: post.aiContext, from_cache: true }) }],
                };
            }
            const context = await generateHistoricalContext(post.content, post.year, post.location);
            post.aiContext = context;
            await post.save();
            return {
                content: [{ type: 'text', text: JSON.stringify({ context, from_cache: false }) }],
            };
        }
    );

    // ── verify_claim ───────────────────────────────────────────────────────────
    server.tool(
        'verify_claim',
        'RAG fact-check a post using Atlas Vector Search + Gemini. Returns VERIFIED, DISPUTED, or INSUFFICIENT DATA.',
        {
            postId: z.string().describe('MongoDB ObjectId of the post to fact-check'),
        },
        async ({ postId }) => {
            const post = await Post.findById(postId).lean();
            if (!post) {
                return { content: [{ type: 'text', text: 'Post not found.' }], isError: true };
            }
            if (post.verificationStatus !== 'Pending' && post.aiVerificationResult) {
                return {
                    content: [{ type: 'text', text: JSON.stringify({ verification: post.aiVerificationResult, from_cache: true }) }],
                };
            }

            const queryText = `Context: ${post.location.name} in Year ${post.year}. Claim: ${post.content}`;
            const queryVector = await embedText(queryText);

            const retrievedFacts = await HistoricalFact.aggregate([
                {
                    $vectorSearch: {
                        index: 'historicalVectorIndex',
                        path: 'embedding',
                        queryVector,
                        numCandidates: 100,
                        limit: 3,
                        filter: {
                            $and: [
                                { 'yearRange.start': { $lte: post.year } },
                                { 'yearRange.end':   { $gte: post.year } },
                                { locationKeywords: post.location.name },
                            ],
                        },
                    },
                },
                { $project: { _id: 0, text: 1, yearRange: 1, source: 1, score: { $meta: 'vectorSearchScore' } } },
            ]).exec();

            const verificationResult = await verifyClaim(post.content, post.year, post.location, retrievedFacts);

            const verdict =
                verificationResult.startsWith('VERDICT: VERIFIED') ? 'Verified' :
                verificationResult.startsWith('VERDICT: DISPUTED') ? 'Disputed' : 'Pending';

            await Post.findByIdAndUpdate(postId, {
                $set: { verificationStatus: verdict, aiVerificationResult: verificationResult },
            });

            return {
                content: [{ type: 'text', text: JSON.stringify({ verification: verificationResult, verdict, from_cache: false }) }],
            };
        }
    );

    // ── search_historical_facts ────────────────────────────────────────────────
    server.tool(
        'search_historical_facts',
        'Semantic search the HistoricalFact knowledge base. Optionally filter by year and location keyword.',
        {
            query:           z.string().describe('Natural language query, e.g. "Roman aqueducts in 100 AD"'),
            year:            z.number().optional().describe('Filter facts covering this specific year'),
            locationKeyword: z.string().optional().describe('Filter by location keyword, e.g. "Rome"'),
            limit:           z.number().optional().default(5).describe('Number of results (default 5)'),
        },
        async ({ query, year, locationKeyword, limit }) => {
            const queryVector = await embedText(query);

            const filterClauses = [];
            if (year != null) {
                filterClauses.push({ 'yearRange.start': { $lte: year } });
                filterClauses.push({ 'yearRange.end':   { $gte: year } });
            }
            if (locationKeyword) {
                filterClauses.push({ locationKeywords: locationKeyword });
            }

            const facts = await HistoricalFact.aggregate([
                {
                    $vectorSearch: {
                        index: 'historicalVectorIndex',
                        path: 'embedding',
                        queryVector,
                        numCandidates: 150,
                        limit,
                        ...(filterClauses.length > 0 ? { filter: { $and: filterClauses } } : {}),
                    },
                },
                {
                    $project: {
                        _id: 0, text: 1, yearRange: 1, locationKeywords: 1, source: 1,
                        score: { $meta: 'vectorSearchScore' },
                    },
                },
            ]).exec();

            return {
                content: [{ type: 'text', text: JSON.stringify({ count: facts.length, facts }, null, 2) }],
            };
        }
    );

    // ── get_stats ──────────────────────────────────────────────────────────────
    server.tool(
        'get_stats',
        'Aggregate stats: total posts, total facts, top years, most active locations.',
        {},
        async () => {
            const [totalPosts, totalFacts, topYears, topLocations] = await Promise.all([
                Post.countDocuments(),
                HistoricalFact.countDocuments(),
                Post.aggregate([
                    { $group: { _id: '$year', count: { $sum: 1 } } },
                    { $sort: { count: -1 } },
                    { $limit: 10 },
                ]),
                Post.aggregate([
                    { $group: { _id: '$location.name', count: { $sum: 1 } } },
                    { $sort: { count: -1 } },
                    { $limit: 10 },
                ]),
            ]);
            return {
                content: [{ type: 'text', text: JSON.stringify({ totalPosts, totalFacts, topYears, topLocations }, null, 2) }],
            };
        }
    );

    return server;
}

// ── Transport manager ─────────────────────────────────────────────────────────
// HTTP/SSE requires one SSEServerTransport instance per connected client.
// We keep a map of sessionId → transport so POST messages can be routed correctly.

const transports = new Map(); // sessionId → SSEServerTransport

/**
 * Mount MCP routes onto an Express app.
 * Call this from server.js:  mountMcp(app);
 *
 * Routes added:
 *   GET    /mcp   — SSE stream (client opens this to receive messages)
 *   POST   /mcp   — JSON-RPC messages from the client
 *   DELETE /mcp   — Client disconnect (optional, cleans up the map)
 */
function mountMcp(app) {
    // GET /mcp — open SSE stream for a new client
    app.get('/mcp', async (req, res) => {
        const mcpServer  = createMcpServer();
        const transport  = new SSEServerTransport('/mcp', res);

        transports.set(transport.sessionId, transport);
        res.on('close', () => transports.delete(transport.sessionId));

        await mcpServer.connect(transport);
    });

    // POST /mcp — receive JSON-RPC messages from an already-connected client
    app.post('/mcp', async (req, res) => {
        const sessionId  = req.query.sessionId || req.headers['mcp-session-id'];
        const transport  = transports.get(sessionId);

        if (!transport) {
            return res.status(400).json({ error: 'Unknown sessionId. Open GET /mcp first.' });
        }

        await transport.handlePostMessage(req, res, req.body);
    });

    // DELETE /mcp — client signals it is done
    app.delete('/mcp', (req, res) => {
        const sessionId = req.query.sessionId || req.headers['mcp-session-id'];
        transports.delete(sessionId);
        res.status(204).send();
    });

    console.log('MCP server mounted at /mcp (HTTP/SSE)');
}

module.exports = { mountMcp };