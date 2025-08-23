// This is a Vercel Serverless Function
// It securely runs on the backend, just like the Firebase Function.

// UPDATED: Use 'require' for Node.js compatibility on Vercel
const { GoogleGenerativeAI } = require("@google/generative-ai");

export default async function handler(request, response) {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Allow-Methods', 'POST');
        response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        response.status(200).end();
        return;
    }
    
    // Set CORS headers for the main request
    response.setHeader('Access-Control-Allow-Origin', '*');


    // Get the secret API keys from Vercel's Environment Variables
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

    try {
        const { model, conversationHistory } = request.body;

        let aiResponseText = "";

        if (model === 'gemini') {
            const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
            const geminiModel = genAI.getGenerativeModel({ model: "gemini-pro" });

            // Convert the conversation history to the format Gemini expects
            const geminiHistory = conversationHistory.map(message => ({
                role: message.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: message.content }]
            }));
            
            // The last message is the new prompt
            const lastMessage = geminiHistory.pop();

            const chat = geminiModel.startChat({ history: geminiHistory });
            const result = await chat.sendMessage(lastMessage.parts[0].text);
            const geminiResponse = await result.response;
            aiResponseText = geminiResponse.text();

        } else if (model === 'deepseek') {
            const apiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "model": "deepseek/deepseek-chat",
                    "messages": conversationHistory
                })
            });

            if (!apiResponse.ok) {
                const errorBody = await apiResponse.text();
                throw new Error(`OpenRouter API error: ${apiResponse.status} ${errorBody}`);
            }

            const data = await apiResponse.json();
            aiResponseText = data.choices[0].message.content;
        } else {
            aiResponseText = "Invalid model selected.";
        }
        
        // Send the successful response back to the frontend
        response.status(200).json({ response: aiResponseText });

    } catch (error) {
        console.error("Error in Vercel function:", error);
        response.status(500).json({ error: "An internal error occurred." });
    }
}

