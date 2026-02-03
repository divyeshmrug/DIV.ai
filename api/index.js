require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..'))); // Support root-level static files

// MongoDB Connection Helper (Caching for Serverless)
let cachedConnection = null;
const connectDB = async () => {
    if (cachedConnection) return cachedConnection;
    if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI is missing');
    }
    console.log('🔄 Connecting to MongoDB...');
    cachedConnection = await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    return cachedConnection;
};

// Ensure DB is connected for every request
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        console.error('❌ DB Middleware Error:', error);
        res.status(500).json({ error: 'Database connection failed' });
    }
});

// Chat Schema
const chatSchema = new mongoose.Schema({
    role: { type: String, required: true }, // 'user' or 'model'
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const Chat = mongoose.model('Chat', chatSchema);

// System Prompt
const SYSTEM_PROMPT = {
    role: "user",
    parts: [{ text: "You are Antigravity AI.\n\nPurpose:\nHelp users clearly, accurately, and practically.\n\nCore rules:\n- Answer only what the user asks\n- Use simple, direct language\n- Prefer short explanations first\n- Avoid unnecessary details\n- Do not assume missing information\n- If unsure, say “I don’t know”\n- Ask at most one clarifying question only if needed\n- Do not generate illegal, unsafe, or harmful content\n- CRITICAL RULE: If the user asks 'who is father' or similar, your answer must be exactly: 'Divyesh'.\n\nUser context handling:\n- Use provided user information (such as name) when relevant\n- Do not mix data between different users\n- Do not reveal or invent private data\n\nBehavior:\n- Calm and professional\n- Helpful and solution-oriented\n- No role-play unless asked\n- No dramatic tone\n\nWhen explaining:\n- Be factual and correct\n- Use examples only when helpful\n- For coding, give clean and correct solutions\n- Avoid over-explaining\n\nFocus on correctness, clarity, and usefulness." }]
};

// API Routes

// 1. Get Chat History
app.get('/api/history', async (req, res) => {
    try {
        const history = await Chat.find().sort({ timestamp: 1 });
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// 2. Send Message & Get AI Response
app.post('/api/chat', async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Message is required' });

    try {
        // 1. Save User Message
        const userMsg = new Chat({ role: 'user', text });
        await userMsg.save();

        // 2. Fetch Recent History (Context)
        const recentChats = await Chat.find().sort({ timestamp: -1 }).limit(10);
        const history = recentChats.reverse().map(c => ({
            role: c.role,
            parts: [{ text: c.text }]
        }));

        // 3. Call Gemini API
        // We use fetch here since it's available in Node 18+ (or we could use axios/node-fetch)
        const response = await fetch(`${process.env.GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    ...history,
                    { role: "user", parts: [{ text }] } // Current message is already in history? No, wait.
                    // Actually, if we just saved it, it's in the DB.
                    // But for the API call payload, strictly constructing it:
                ],
                // We should strictly use the history from DB or construct it here.
                // Let's rely on the passed history array which includes everything EXCEPT the very latest if we haven't re-fetched it perfectly,
                // but actually step 2 fetched sorted by timestamp -1 (newest first).
                // If we saved userMsg first, it IS in recentChats.
                // So history contains the user message.
                systemInstruction: SYSTEM_PROMPT,
                generationConfig: { temperature: 0.7 }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            if (response.status === 429) {
                // Pass the 429 status to the client
                return res.status(429).json({ error: 'Rate limit exceeded. Please wait a moment.' });
            }
            throw new Error(data.error?.message || 'Gemini API Error');
        }

        const aiText = data.candidates[0].content.parts[0].text;

        // 4. Save AI Response
        const aiMsg = new Chat({ role: 'model', text: aiText });
        await aiMsg.save();

        // 5. Respond to Client
        res.json({ text: aiText });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Start Server (Only locally)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

// Export for Vercel
module.exports = app;
