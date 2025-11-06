// backend/scripts/setupIndexes.js
require('dotenv').config();
const mongoose = require('mongoose');
const HistoricalFact = require('../models/historicalFactModel');
const { embedText } = require('../services/aiService');


// Sample historical data for testing
const sampleHistoricalData = [
    {
        text: "The Colosseum, also known as the Flavian Amphitheatre, was completed around 80 AD under Emperor Titus. It could hold between 50,000 and 80,000 spectators and was used for gladiatorial contests and public spectacles.",
        yearRange: { start: 70, end: 100 },
        locationKeywords: ['Rome', 'Italy', 'Roman Empire'],
        source: 'Ancient History Encyclopedia'
    },
    {
        text: "The Roman Forum was the center of political and social activity in ancient Rome. During the reign of Trajan (98-117 AD), the Forum reached its maximum splendor with numerous temples, basilicas, and monuments.",
        yearRange: { start: 90, end: 130 },
        locationKeywords: ['Rome', 'Italy', 'Roman Empire'],
        source: 'Roman Historical Records'
    },
    {
        text: "Under Emperor Hadrian (117-138 AD), the Pantheon was rebuilt with its famous concrete dome, which remains the world's largest unreinforced concrete dome. The building served as a temple to all Roman gods.",
        yearRange: { start: 110, end: 140 },
        locationKeywords: ['Rome', 'Italy', 'Roman Empire'],
        source: 'Architectural History of Rome'
    },
    {
        text: "During the 2nd century AD, Rome had a population of over 1 million people, making it the largest city in the ancient world. The city featured advanced infrastructure including aqueducts, sewers, and public baths.",
        yearRange: { start: 100, end: 200 },
        locationKeywords: ['Rome', 'Italy', 'Roman Empire'],
        source: 'Demographics of Ancient Rome'
    },
    {
        text: "The Circus Maximus was an ancient Roman chariot-racing stadium. During the 2nd century AD, it could accommodate approximately 150,000 spectators and was the venue for the prestigious ludi Romani games.",
        yearRange: { start: 100, end: 150 },
        locationKeywords: ['Rome', 'Italy', 'Roman Empire'],
        source: 'Roman Sports and Entertainment'
    }
];

async function setupIndexesAndData() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB successfully');

        // Step 1: Ensure indexes are created
        console.log('\n=== Creating Indexes ===');
        await HistoricalFact.createIndexes();
        console.log('✓ All indexes created successfully');

        // Step 2: Check if we already have data
        const existingCount = await HistoricalFact.countDocuments();
        console.log(`\nFound ${existingCount} existing historical facts in database`);

        if (existingCount > 0) {
            const answer = await askQuestion('Do you want to delete existing data and re-ingest? (yes/no): ');
            if (answer.toLowerCase() !== 'yes') {
                console.log('Keeping existing data. Exiting...');
                await mongoose.connection.close();
                process.exit(0);
            }
            
            console.log('Deleting existing data...');
            await HistoricalFact.deleteMany({});
            console.log('✓ Existing data deleted');
        }

        // Step 3: Ingest sample data with embeddings
        console.log('\n=== Ingesting Sample Data ===');
        for (let i = 0; i < sampleHistoricalData.length; i++) {
            const data = sampleHistoricalData[i];
            console.log(`\nProcessing fact ${i + 1}/${sampleHistoricalData.length}...`);
            console.log(`  Location: ${data.locationKeywords[0]}`);
            console.log(`  Period: ${data.yearRange.start}-${data.yearRange.end}`);
            
            try {
                // Generate embedding
                console.log('  Generating embedding...');
                const embedding = await embedText(data.text);
                console.log(`  ✓ Embedding generated (dimension: ${embedding.length})`);
                
                // Create and save document
                const newFact = new HistoricalFact({
                    ...data,
                    embedding: embedding
                });
                
                await newFact.save();
                console.log('  ✓ Fact saved to database');
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error(`  ✗ Error processing fact: ${error.message}`);
            }
        }

        console.log('\n=== Setup Complete ===');
        console.log(`Successfully ingested ${await HistoricalFact.countDocuments()} historical facts`);
        console.log('\nNext steps:');
        console.log('1. Go to MongoDB Atlas');
        console.log('2. Navigate to your cluster > Search');
        console.log('3. Create a Vector Search Index named "historicalVectorIndex"');
        console.log('4. Use the following configuration:');
        console.log(`
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 768,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "yearRange.start"
    },
    {
      "type": "filter",
      "path": "yearRange.end"
    },
    {
      "type": "filter",
      "path": "locationKeywords"
    }
  ]
}
        `);

        await mongoose.connection.close();
        console.log('\nDatabase connection closed');
        process.exit(0);

    } catch (error) {
        console.error('Error during setup:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
}

// Helper function for user input
function askQuestion(question) {
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => {
        readline.question(question, answer => {
            readline.close();
            resolve(answer);
        });
    });
}

// Run the setup
setupIndexesAndData();