// backend/services/aiService.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Add debugging to check API key
console.log("=== AI Service Initialization ===");
console.log("GOOGLE_API_KEY exists:", !!process.env.GOOGLE_API_KEY);
console.log("GOOGLE_API_KEY length:", process.env.GOOGLE_API_KEY?.length || 0);
console.log("================================");

// Validate API key exists
if (!process.env.GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY is not set in environment variables!");
}

// Initialize with your API key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Model names - Verified working with your API key
const textModel = "gemini-pro-latest"; 
const embeddingModel = "text-embedding-004";

// 1. Function for general context generation
async function generateHistoricalContext(postText, year, location) {
    try {
        const model = genAI.getGenerativeModel({ model: textModel });
        
        const prompt = `Provide historical context for the following claim:
Location: ${location.name}
Year: ${year}
Claim: ${postText}

Please provide relevant historical information about this location and time period that helps verify or contextualize this claim.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("AI Context Generation Error:", error.message);
        throw new Error("Failed to generate historical context.");
    }
}

// 2. Function to generate embeddings
async function embedText(text) {
    try {
        const model = genAI.getGenerativeModel({ model: embeddingModel });
        
        // The correct format for the embedding API
        const result = await model.embedContent(text);
        
        // Return the embedding values
        return result.embedding.values;
        
    } catch (error) {
        console.error("AI Embedding Error:", error.message);
        console.error("Full error:", error);
        throw new Error("Failed to generate text embedding.");
    }
}

// 3. Function for RAG verification 
async function verifyClaim(postText, year, location, retrievedFacts) {
    try {
        const model = genAI.getGenerativeModel({ model: textModel });
        
        // Build context from retrieved facts
        let factsContext = "Retrieved Historical Facts:\n\n";
        if (retrievedFacts && retrievedFacts.length > 0) {
            retrievedFacts.forEach((fact, index) => {
                factsContext += `Fact ${index + 1} (Relevance Score: ${fact.score ? fact.score.toFixed(3) : 'N/A'}):\n`;
                factsContext += `  Text: ${fact.text}\n`;
                factsContext += `  Time Period: ${fact.yearRange?.start || 'Unknown'} - ${fact.yearRange?.end || 'Unknown'}\n`;
                factsContext += `  Source: ${fact.source || 'Unknown'}\n\n`;
            });
        } else {
            factsContext += "No relevant historical facts found in the database.\n\n";
        }
        
        const prompt = `You are a historical fact-checker. Analyze the following claim against retrieved historical facts.

${factsContext}

Claim to Verify:
Location: ${location.name}
Year: ${year}
Claim: ${postText}

Instructions:
1. Compare the claim against the retrieved historical facts
2. Consider the time period and location context
3. Provide one of these verdicts:
   - VERDICT: VERIFIED - if the claim aligns with historical facts
   - VERDICT: DISPUTED - if the claim contradicts historical facts
   - VERDICT: INSUFFICIENT DATA - if there's not enough information to verify

4. Explain your reasoning in 2-3 sentences
5. If verified or disputed, cite which facts support your conclusion

Format your response as:
VERDICT: [YOUR VERDICT]
REASONING: [Your explanation]`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
        
    } catch (error) {
        console.error("AI Verification Error:", error.message);
        throw new Error("Failed to verify claim with AI.");
    }
}

module.exports = { generateHistoricalContext, embedText, verifyClaim };