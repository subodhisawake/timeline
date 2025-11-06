const mongoose = require('mongoose');
const HistoricalFact = require('../models/historicalFactModel');
const { embedText } = require('../services/aiService');
require('dotenv').config();


// Example raw data (replace with reading a real file)
const rawHistoricalData = [
    { 
        text: "The Colosseum, also known as the Flavian Amphitheatre, was completed around 80 AD, and was an essential venue for gladiatorial contests.",
        yearRange: { start: 70, end: 85 },
        locationKeywords: ['Rome', 'Italy'],
        source: 'Ancient History Encyclopedia'
    },
    // ... add more facts ...
];

async function ingestData() {
    console.log("Starting data ingestion and vectorization...");
    
    for (const data of rawHistoricalData) {
        try {
            // 1. Generate the embedding
            const embedding = await embedText(data.text);
            
            // 2. Create the new document with the embedding
            const newFact = new HistoricalFact({
                ...data,
                embedding: embedding
            });

            // 3. Save to MongoDB
            await newFact.save();
            console.log(`Successfully ingested fact for ${data.locationKeywords[0]}.`);

        } catch (error) {
            console.error(`Error processing fact: ${error.message}`);
        }
    }
    console.log("Data ingestion complete.");
    mongoose.connection.close();
}