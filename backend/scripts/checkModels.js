// backend/scripts/checkModels.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function listModels() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        
        console.log("Fetching available models...\n");
        
        // List all available models
        const models = await genAI.listModels();
        
        console.log("=== GENERATION MODELS ===");
        const generationModels = models.filter(m => 
            m.supportedGenerationMethods?.includes('generateContent')
        );
        generationModels.forEach(model => {
            console.log(`✓ ${model.name}`);
            console.log(`  Display Name: ${model.displayName}`);
            console.log(`  Methods: ${model.supportedGenerationMethods?.join(', ')}`);
            console.log();
        });
        
        console.log("=== EMBEDDING MODELS ===");
        const embeddingModels = models.filter(m => 
            m.supportedGenerationMethods?.includes('embedContent')
        );
        embeddingModels.forEach(model => {
            console.log(`✓ ${model.name}`);
            console.log(`  Display Name: ${model.displayName}`);
            console.log(`  Methods: ${model.supportedGenerationMethods?.join(', ')}`);
            console.log();
        });
        
        console.log("=== RECOMMENDED CONFIGURATION ===");
        if (generationModels.length > 0) {
            // Find the best generation model
            const bestGenModel = generationModels.find(m => 
                m.name.includes('gemini-pro') || m.name.includes('gemini-1.5')
            ) || generationModels[0];
            console.log(`Text Generation: ${bestGenModel.name.replace('models/', '')}`);
        }
        
        if (embeddingModels.length > 0) {
            // Find the best embedding model
            const bestEmbedModel = embeddingModels.find(m => 
                m.name.includes('embedding')
            ) || embeddingModels[0];
            console.log(`Text Embedding: ${bestEmbedModel.name.replace('models/', '')}`);
        }
        
    } catch (error) {
        console.error("Error listing models:", error.message);
        console.error("\nMake sure:");
        console.error("1. Your GOOGLE_API_KEY is set correctly in .env");
        console.error("2. Your API key has access to the Generative Language API");
        console.error("3. You have an active internet connection");
    }
}

listModels();