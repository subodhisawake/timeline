// backend/services/aiService.js
const { GoogleGenAI } = require("@google/genai");

// Initialization: 
// We use 'v1beta' because Gemini 3 models are currently in preview.
const ai = new GoogleGenAI({ 
    apiKey: process.env.GOOGLE_API_KEY,
    httpOptions: { apiVersion: 'v1beta' } 
});

// MARCH 2026 PREVIEW ALIASES
const MODELS = {
    // These specific strings are required for March 2026 previews
    TEXT: "gemini-3-flash-preview", 
    EMBEDDING: "gemini-embedding-2-preview" 
};

/**
 * 1. Function for general context generation
 */
async function generateHistoricalContext(postText, year, location) {
    try {
        const response = await ai.models.generateContent({
            model: MODELS.TEXT,
            contents: [{
                role: 'user',
                parts: [{
                    text: `Context for ${location.name} in ${year}: ${postText}. Give a brief historical summary.`
                }]
            }]
        });

        // The new SDK returns text as a property string
        return response.text; 
    } catch (error) {
        console.error("AI Context Generation Error:", error.message);
        throw new Error("Failed to generate historical context.");
    }
}

/**
 * 2. Function to generate embeddings (RAG)
 */
async function embedText(text) {
    try {
        // Correct array-based structure for the new SDK
        const result = await ai.models.embedContent({
            model: MODELS.EMBEDDING,
            contents: [text] 
        });
        
        return result.embeddings[0].values;
    } catch (error) {
        console.error("AI Embedding Error:", error.message);
        // Stable fallback
        try {
            const fallback = await ai.models.embedContent({
                model: "gemini-embedding-001",
                contents: [text]
            });
            return fallback.embeddings[0].values;
        } catch (e) {
            throw new Error("Failed to generate text embedding.");
        }
    }
}

/**
 * 3. Function for RAG verification 
 */
async function verifyClaim(postText, year, location, retrievedFacts) {
    try {
        let factsContext = "Facts:\n" + (retrievedFacts?.map(f => f.text).join('\n') || "None.");
        
        const response = await ai.models.generateContent({
            model: MODELS.TEXT,
            contents: [{
                role: 'user',
                parts: [{
                    text: `Analyze claim against facts:\n${factsContext}\nClaim: In ${year} at ${location.name}: "${postText}"\n\nVerdict and 2-sentence reasoning.`
                }]
            }]
        });

        return response.text;
    } catch (error) {
        console.error("AI Verification Error:", error.message);
        throw new Error("Failed to verify claim.");
    }
}

module.exports = { generateHistoricalContext, embedText, verifyClaim };