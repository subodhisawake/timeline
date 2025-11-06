const mongoose = require('mongoose');

const historicalFactSchema = new mongoose.Schema({
    // The actual text from the historical source
    text: {
        type: String,
        required: true
    },
    // The year or year range this fact applies to (for filtering)
    yearRange: {
        start: {
            type: Number,
            required: true
        },
        end: {
            type: Number,
            required: true
        }
    },
    // The geographical area (e.g., 'Mediterranean', 'Rome')
    locationKeywords: {
        type: [String],
        required: true
    },
    // Metadata for credibility
    source: String, 
    // THE CRUCIAL RAG FIELD: The vector embedding of the 'text' field
    embedding: {
        type: [Number], // Array of numbers
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// 💡 CRITICAL: Create indexes for $vectorSearch filter fields
// These are REQUIRED for the filter parameter in Atlas Vector Search
historicalFactSchema.index({ 'yearRange.start': 1 });
historicalFactSchema.index({ 'yearRange.end': 1 });
historicalFactSchema.index({ locationKeywords: 1 });

// Compound index for better performance when filtering by both year and location
historicalFactSchema.index({ 
    'yearRange.start': 1, 
    'yearRange.end': 1, 
    locationKeywords: 1 
});

// We do NOT need a manual index on 'embedding'; the Atlas Vector Search Index handles this.
module.exports = mongoose.model('HistoricalFact', historicalFactSchema);