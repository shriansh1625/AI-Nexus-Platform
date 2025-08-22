const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fetch = require("node-fetch");

admin.initializeApp();
const db = admin.firestore();

// --- API Keys (You've already set these) ---
const GEMINI_API_KEY = functions.config().gemini.key;
const OPENROUTER_API_KEY = functions.config().openrouter.key;
// ------------------------------------------

// --- NEW DEBUGGING CODE ---
console.log("Attempting to initialize with keys.");
console.log("Gemini Key available:", !!GEMINI_API_KEY);
console.log("OpenRouter Key available:", !!OPENROUTER_API_KEY);
// --------------------------

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

exports.getAiResponse = functions.https.onRequest(async (req, res) => {
    // Set CORS headers for preflight requests
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    // Send response for preflight request
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const { model, conversationId, userId } = req.body;

        if (!model || !conversationId || !userId) {
            return res.status(400).json({ error: "Missing required fields: model, conversationId, userId" });
        }

        // Fetch conversation history from Firestore
        const messagesRef = db.collection(`users/${userId}/conversations/${conversationId}/messages`);
        const messagesSnapshot = await messagesRef.orderBy('timestamp', 'asc').get();
        
        let aiResponseText = "";

        if (model === 'gemini') {
            const conversationHistory = messagesSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    role: data.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: data.content }]
                };
            });
            conversationHistory.pop(); // Remove the current user prompt

            const geminiModel = genAI.getGenerativeModel({ model: "gemini-pro" });
            const chat = geminiModel.startChat({ history: conversationHistory });
            const lastMessage = messagesSnapshot.docs[messagesSnapshot.docs.length - 1].data().content;
            
            const result = await chat.sendMessage(lastMessage);
            const response = await result.response;
            aiResponseText = response.text();

        } else if (model === 'deepseek') {
            const openRouterHistory = messagesSnapshot.docs.map(doc => ({
                role: doc.data().role,
                content: doc.data().content
            }));

            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "model": "deepseek/deepseek-chat",
                    "messages": openRouterHistory
                })
            });
            
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`OpenRouter API error: ${response.status} ${errorBody}`);
            }

            const data = await response.json();
            aiResponseText = data.choices[0].message.content;

        } else {
            return res.status(400).json({ error: "Invalid model specified." });
        }

        // Save AI response to Firestore
        await messagesRef.add({
            role: 'assistant',
            content: aiResponseText,
            timestamp: new Date()
        });

        res.status(200).json({ response: aiResponseText });

    } catch (error) {
        console.error("Error in getAiResponse function:", error);
        res.status(500).json({ error: "An internal error occurred." });
    }
});
