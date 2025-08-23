// This is a Vercel Serverless Function
// It securely runs on the backend, just like the Firebase Function.

export default async function handler(request, response) {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
        response.status(200).end();
        return;
    }

    // Get the secret API keys from Vercel's Environment Variables
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

    try {
        const { model, conversationHistory } = request.body;

        let aiResponseText = "";

        if (model === 'deepseek') {
            const apiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "model": "deepseek/deepseek-chat",
                    "messages": conversationHistory // Send the history from the frontend
                })
            });

            if (!apiResponse.ok) {
                const errorBody = await apiResponse.text();
                throw new Error(`OpenRouter API error: ${apiResponse.status} ${errorBody}`);
            }

            const data = await apiResponse.json();
            aiResponseText = data.choices[0].message.content;
        } else {
            // Placeholder for Gemini or other models if you add them back later
            aiResponseText = "We are currently working on this model😥😥. Please try again later 😅😅 .";
        }
        
        // Send the successful response back to the frontend
        response.status(200).json({ response: aiResponseText });

    } catch (error) {
        console.error("Error in Vercel function:", error);
        response.status(500).json({ error: "An internal error occurred." });
    }
}
