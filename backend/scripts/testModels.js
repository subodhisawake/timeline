// backend/scripts/testModels.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// List of possible model names to try
const modelsToTry = [
    // Gemini 1.5 variants
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash",
    "gemini-1.5-pro-latest",
    "gemini-1.5-pro",
    
    // Gemini Pro variants
    "gemini-pro",
    "gemini-pro-latest",
    
    // Older variants
    "gemini-1.0-pro",
    "gemini-1.0-pro-latest",
];

async function testModel(modelName) {
    try {
        console.log(`Testing: ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const result = await model.generateContent("Say 'Hello'");
        const response = await result.response;
        const text = response.text();
        
        console.log(`✓ SUCCESS: ${modelName}`);
        console.log(`  Response: ${text.substring(0, 50)}...\n`);
        return modelName;
    } catch (error) {
        console.log(`✗ FAILED: ${modelName}`);
        console.log(`  Error: ${error.message}\n`);
        return null;
    }
}

async function findWorkingModel() {
    console.log("=== Testing Text Generation Models ===\n");
    
    let workingModel = null;
    
    for (const modelName of modelsToTry) {
        const result = await testModel(modelName);
        if (result && !workingModel) {
            workingModel = result;
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log("\n=== RESULTS ===");
    if (workingModel) {
        console.log(`✓ Found working model: ${workingModel}`);
        console.log(`\nUpdate your aiService.js with:`);
        console.log(`const textModel = "${workingModel}";`);
    } else {
        console.log("✗ No working models found.");
        console.log("\nPossible issues:");
        console.log("1. API key doesn't have access to Gemini models");
        console.log("2. API key is invalid or expired");
        console.log("3. Network connectivity issues");
        console.log("\nTry creating a new API key at: https://aistudio.google.com/app/apikey");
    }
    
    // Test embedding model
    console.log("\n=== Testing Embedding Model ===\n");
    try {
        console.log("Testing: text-embedding-004...");
        const embedModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const result = await embedModel.embedContent("test");
        console.log(`✓ SUCCESS: text-embedding-004`);
        console.log(`  Embedding dimension: ${result.embedding.values.length}`);
        console.log(`\nYour embedding model is working correctly!`);
    } catch (error) {
        console.log(`✗ FAILED: text-embedding-004`);
        console.log(`  Error: ${error.message}`);
        console.log("\nTry using: embedding-001 instead");
    }
}

findWorkingModel();