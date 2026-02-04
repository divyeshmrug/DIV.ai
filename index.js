require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Connection Helper (Caching for Serverless)
let cachedConnection = null;
let cachedPromise = null;

const connectDB = async () => {
    if (cachedConnection) return cachedConnection;
    if (cachedPromise) return cachedPromise;

    if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI is missing in Vercel Environment Variables');
    }

    cachedPromise = (async () => {
        try {
            console.log('🔄 Connecting to MongoDB...');
            const conn = await mongoose.connect(process.env.MONGODB_URI, {
                serverSelectionTimeoutMS: 5000,
            });
            cachedConnection = conn;
            console.log('✅ Connected to MongoDB');
            return conn;
        } catch (err) {
            cachedPromise = null;
            console.error('❌ MongoDB Connection Error:', err.message);
            throw err;
        }
    })();

    return cachedPromise;
};

// --- SCHEMAS & MODELS ---

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    resetOTP: String,
    resetOTPExpires: Date,
    lastChatReset: { type: Date, default: Date.now },
    chatCount: { type: Number, default: 0 },
    lastChatTime: { type: Date, default: null }
});
const User = mongoose.model('User', userSchema);



// Conversation Schema
const conversationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: 'New Conversation' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
const Conversation = mongoose.model('Conversation', conversationSchema);

// Chat Schema
const chatSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    role: { type: String, required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});
const Chat = mongoose.model('Chat', chatSchema);

// FAQ Schema
const faqSchema = new mongoose.Schema({
    question: { type: String, unique: true, lowercase: true },
    answer: String,
    hits: { type: Number, default: 1 },
    createdAt: { type: Date, default: Date.now }
});
const FaqCache = mongoose.model('FaqCache', faqSchema);

// Analytics Schema
const analyticsSchema = new mongoose.Schema({
    question: { type: String, unique: true, lowercase: true },
    frequency: { type: Number, default: 1 },
    lastAsked: { type: Date, default: Date.now }
});
const QueryAnalytics = mongoose.model('QueryAnalytics', analyticsSchema);

// --- INITIALIZATION ---

const seedFAQs = [
    { q: 'hi', a: 'Hello! I am Div.ai. How can I help you today?' },
    { q: 'hello', a: 'Hi there! I am Div.ai, your intelligent assistant. What\'s on your mind?' },
    { q: 'hey', a: 'Hey! Ready to assist you. What do you need?' },
    { q: 'bye', a: 'Goodbye! Have a great day ahead!' },
    { q: 'how are you', a: 'I\'m doing great, thank you for asking! I\'m ready to help you with anything.' },
    { q: 'who are you', a: 'I am Div.ai, a powerful AI assistant designed by Divyesh to help you with code, logic, and more.' },
    { q: 'what is your name', a: 'My name is Div.ai!' },
    { q: 'ok', a: 'Understood! Anything else?' },
    { q: 'thanks', a: 'You\'re very welcome! Happy to help.' },
    { q: 'thank you', a: 'You\'re welcome! I\'m always here if you need more assistance.' }
];

const initSystem = async () => {
    try {
        await connectDB();

        // Seed FAQs
        for (const faq of seedFAQs) {
            await FaqCache.findOneAndUpdate(
                { question: faq.q },
                { answer: faq.a },
                { upsert: true }
            );
        }

        // Seed Admin
        const adminExists = await User.findOne({ username: 'div.ai' });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('111', 10);
            await new User({
                username: 'div.ai',
                email: 'divyeshh099@gmail.com',
                password: hashedPassword
            }).save();
            console.log('👤 [ADMIN] Admin user created');
        }
    } catch (e) { console.error('❌ Init Error:', e.message); }
};
initSystem();

// --- MIDDLEWARE ---

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        res.status(500).json({ error: 'Database connection failed' });
    }
});

app.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.url}`);
    next();
});

// Email Transporter Setup (with fallback for testing)
const getTransporter = () => {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    // Only use real Gmail if credentials are NOT the placeholders
    if (user && pass && user !== 'your-email@gmail.com' && pass !== 'your-gmail-app-password') {
        console.log('📬 [EMAIL] Using REAL Gmail Transporter');
        return nodemailer.createTransport({
            service: 'gmail',
            auth: { user, pass }
        });
    } else {
        console.warn("⚠️ [DEV MODE] No real EMAIL_USER/PASS found. OTPs will be printed to this console.");
        return {
            sendMail: (options) => {
                console.log("\n📩 --- DIV.AI VIRTUAL EMAIL ---");
                console.log(`To: ${options.to}`);
                console.log(`Subject: ${options.subject}`);
                console.log(`Text: ${options.text}`);
                console.log("-------------------------------\n");
                return Promise.resolve({ messageId: 'dev-mode' });
            }
        };
    }
};

const transporter = getTransporter();

const JWT_SECRET = process.env.JWT_SECRET || 'div_ai_secret_key_123';

// Auth Middleware
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(400).json({ error: 'Invalid token.' });
    }
};

const SYSTEM_PROMPT = `You are Div.ai.

Purpose:
Help users clearly, accurately, and practically.

Core rules:
- Answer only what the user asks
- Use simple, direct language
- Prefer short explanations first
- Avoid unnecessary details
- Do not assume missing information
- If unsure, say “I don’t know”
- Ask at most one clarifying question only if needed
- Do not generate illegal, unsafe, or harmful content
- CRITICAL RULE: If the user asks 'who is father' or similar, your answer must be exactly: 'Divyesh'.

User context handling:
- Use provided user information (such as name) when relevant
- Do not mix data between different users
- Do not reveal or invent private data

Behavior:
- Calm and professional
- Helpful and solution-oriented
- No role-play unless asked
- No dramatic tone

When explaining:
- Be factual and correct
- Use examples only when helpful
- For coding, give clean and correct solutions
- Avoid over-explaining

Focus on correctness, clarity, and usefulness.`;

// Auth Routes

// 1. Register
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'Username, email, and password are required' });

    try {
        const existingUser = await User.findOne({
            $or: [{ username }, { email }]
        });
        if (existingUser) {
            const field = existingUser.username === username ? 'Username' : 'Email';
            return res.status(400).json({ error: `${field} already exists` });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, email, password: hashedPassword });
        await user.save();

        // Notify Admin
        const adminMailOptions = {
            from: `"Div.ai Security" <${process.env.EMAIL_USER}>`,
            to: 'canvadwala@gmail.com',
            subject: `🚨 New User Registration: ${username}`,
            html: `
            <div style="font-family: 'Outfit', sans-serif; background-color: #000000; color: #ffffff; padding: 40px;">
                <div style="max-width: 500px; margin: 0 auto; background: #1a1a1a; border-radius: 20px; padding: 30px; border: 1px solid #333;">
                    <h2 style="color: #00ff80; margin-top: 0;">🚀 New Member Joined!</h2>
                    <p style="color: #ccc; font-size: 16px;">A new user has registered on Div.ai.</p>
                    <div style="background: #000; padding: 20px; border-radius: 10px; margin: 20px 0; border: 1px solid #333;">
                        <p style="margin: 5px 0;"><strong>Username:</strong> <span style="color: #fff;">${username}</span></p>
                        <p style="margin: 5px 0;"><strong>Email:</strong> <span style="color: #fff;">${email}</span></p>
                        <p style="margin: 5px 0;"><strong>Time:</strong> <span style="color: #888;">${new Date().toLocaleString()}</span></p>
                    </div>
                    <p style="font-size: 12px; color: #666;">Div.ai Admin Notification System</p>
                </div>
            </div>
            `
        };

        try {
            await transporter.sendMail(adminMailOptions);
            console.log(`📧 Admin notification sent for user: ${username}`);
        } catch (mailError) {
            console.error('❌ Failed to send admin notification:', mailError);
        }

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Registration failed' });
    }
});

// 3. Forgot Password (Request OTP)
app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Generate 6-digit numeric OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        user.resetOTP = await bcrypt.hash(otp, 10);
        user.resetOTPExpires = Date.now() + 5 * 60 * 1000; // 5 mins
        await user.save();

        const mailOptions = {
            from: `"Div.ai Security" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '🔐 Your Super Login ID',
            html: `
            <div style="font-family: 'Outfit', sans-serif; background-color: #000000; color: #ffffff; padding: 40px; text-align: center;">
                <div style="max-width: 480px; margin: 0 auto; background: #1a1a1a; border-radius: 30px; padding: 40px; box-shadow: 0 20px 60px rgba(0,255,128,0.1); border: 1px solid #333;">
                    
                    <!-- Legendary Header -->
                    <div style="margin-bottom: 30px;">
                        <span style="background: linear-gradient(135deg, #00ff80, #00bfff); -webkit-background-clip: text; color: transparent; font-size: 28px; font-weight: 900; letter-spacing: -1px;">
                            DIV.AI <span style="color: #fff; background: #333; padding: 4px 10px; border-radius: 8px; font-size: 16px; vertical-align: middle;">ID</span>
                        </span>
                    </div>

                    <!-- Mascot / Icon -->
                    <div style="font-size: 60px; margin-bottom: 20px;">
                        🤖
                    </div>

                    <!-- Title -->
                    <h2 style="font-size: 26px; font-weight: 700; margin-bottom: 10px; color: #e0e0e0;">Hello, Legend!</h2>
                    
                    <p style="color: #b0b0b0; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                        You requested to log in to <strong>Div.ai</strong>. Use the One-Time Password below to complete your quest.
                    </p>

                    <!-- OTP Box -->
                    <div style="background: #000; color: #fff; font-size: 36px; font-weight: 800; letter-spacing: 5px; padding: 20px; border-radius: 16px; border: 2px solid #333; margin-bottom: 30px; display: inline-block;">
                        ${otp}
                    </div>

                    <p style="color: #666; font-size: 14px; margin-bottom: 40px;">
                        Valid for 5 minutes. If you didn't ask for this, ignore it safely.
                    </p>

                    <div style="border-top: 1px solid #333; padding-top: 20px;">
                        <p style="color: #444; font-size: 12px;">
                            Secured by Div.ai • Built for Pro Users
                        </p>
                    </div>
                </div>
            </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log(`✅ OTP Email sent successfully to ${email}`);
            res.json({ message: 'OTP sent to your email' });
        } catch (mailError) {
            console.error('❌ OTP Send Error (transporter):', mailError);
            res.status(500).json({ error: `Failed to send OTP: ${mailError.message}` });
        }
    } catch (error) {
        console.error('❌ Forgot Password Route Error:', error);
        res.status(500).json({ error: `Server error: ${error.message}` });
    }
});

// 4. Reset Password (Verify OTP & Change)
app.post('/api/auth/reset-password', async (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json({ error: 'Email, OTP, and new password are required' });

    try {
        const user = await User.findOne({
            email,
            resetOTPExpires: { $gt: Date.now() }
        });

        if (!user) return res.status(400).json({ error: 'Invalid or expired OTP' });

        const isMatch = await bcrypt.compare(otp, user.resetOTP);
        if (!isMatch) return res.status(400).json({ error: 'Invalid or expired OTP' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetOTP = undefined;
        user.resetOTPExpires = undefined;
        await user.save();

        res.json({ message: 'Password reset successful. Please login.' });
    } catch (error) {
        res.status(500).json({ error: 'Reset failed' });
    }
});

// 2. Login
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });

    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ error: 'Invalid username or password' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid username or password' });

        const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, username: user.username });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// 1. Get Conversation List (Protected)
app.get('/api/conversations', verifyToken, async (req, res) => {
    try {
        const conversations = await Conversation.find({ userId: req.user.userId }).sort({ updatedAt: -1 });
        res.json(conversations);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

// 2. Get Messages for a specific Conversation (Protected)
app.get('/api/conversations/:id', verifyToken, async (req, res) => {
    try {
        const history = await Chat.find({
            userId: req.user.userId,
            conversationId: req.params.id
        }).sort({ timestamp: 1 });
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// 3. Get Admin Stats (Protected)
app.get('/api/admin/stats', verifyToken, async (req, res) => {
    try {
        const topFaqs = await FaqCache.find().sort({ hits: -1 }).limit(20);
        const topQueries = await QueryAnalytics.find().sort({ frequency: -1 }).limit(20);
        const totalFaqs = await FaqCache.countDocuments();

        const hitsResult = await FaqCache.aggregate([
            { $group: { _id: null, total: { $sum: "$hits" } } }
        ]);
        const totalHits = hitsResult.length > 0 ? hitsResult[0].total : 0;

        res.json({ topFaqs, topQueries, totalFaqs, totalHits });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Legacy Endpoint (Redirect to newest if possible or empty)
app.get('/api/history', verifyToken, async (req, res) => {
    try {
        const latestConv = await Conversation.findOne({ userId: req.user.userId }).sort({ updatedAt: -1 });
        if (!latestConv) return res.json([]);

        const history = await Chat.find({
            userId: req.user.userId,
            conversationId: latestConv._id
        }).sort({ timestamp: 1 });
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// 3. Clear Chat History (Protected - SOFT RESET)
app.delete('/api/history', verifyToken, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user.userId, { lastChatReset: new Date() });
        res.json({ message: 'Chat history reset for new conversation' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to reset history' });
    }
});


// Diagnostic Route (Check API Key Health)
app.get('/api/diag', async (req, res) => {
    try {
        const response = await fetch(`${process.env.GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: 'Ping' }] }]
            })
        });
        const data = await response.json();
        res.json({
            status: response.status,
            ok: response.ok,
            model: process.env.GEMINI_API_URL.split('/').slice(-1)[0],
            details: data
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// LLM Provider Functions
async function callGemini(history) {
    try {
        const isGemma = process.env.GEMINI_API_URL.toLowerCase().includes('gemma');

        const body = {
            contents: history,
            generationConfig: { temperature: 0.7 }
        };

        // Gemma models don't support 'system_instruction' field
        if (!isGemma) {
            body.system_instruction = { parts: [{ text: SYSTEM_PROMPT }] };
        } else {
            // For Gemma, prepend the system prompt to the first user message
            if (history.length > 0 && history[0]?.parts?.[0]) {
                history[0].parts[0].text = `[SYSTEM]: ${SYSTEM_PROMPT}\n\n${history[0].parts[0].text}`;
            }
        }

        const response = await fetch(`${process.env.GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        if (!response.ok) {
            console.error("❌ Gemini API Error:", JSON.stringify(data, null, 2));
            throw new Error(data.error?.message || 'Gemini API Error');
        }
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("❌ Gemini Call Failed:", error);
        throw error;
    }
}

async function callGroq(history) {
    if (!process.env.GROQ_API_KEY) throw new Error("Groq API Key (LLaMA) not configured in .env");

    const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.map(h => ({
            role: h.role === 'model' ? 'assistant' : 'user',
            content: h.parts[0].text
        }))
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            messages: messages,
            model: 'llama-3.3-70b-versatile',
            temperature: 0.7
        })
    });

    const data = await response.json();
    if (!response.ok) {
        console.error("❌ Groq API Error:", JSON.stringify(data, null, 2));
        throw new Error(data.error?.message || 'Groq API Error');
    }
    return data.choices[0].message.content;
}

// 2. Send Message & Get AI Response (Protected)
app.post('/api/chat', verifyToken, async (req, res) => {
    const { text, conversationId, provider } = req.body;
    const userId = req.user.userId;

    if (!text) return res.status(400).json({ error: 'Message is required' });

    try {
        // CHECK COOLDOWN FIRST
        const currentUser = await User.findById(userId);
        const now = new Date();
        const COOLDOWN_MS = 10 * 1000; // 10 seconds
        const MAX_CHATS = 1;

        // Reset counter if cooldown period has passed
        if (currentUser.lastChatTime && (now - currentUser.lastChatTime) >= COOLDOWN_MS) {
            currentUser.chatCount = 0;
        }

        // Check if user has exceeded limit
        if (currentUser.chatCount >= MAX_CHATS) {
            const timeLeft = COOLDOWN_MS - (now - currentUser.lastChatTime);
            const secondsLeft = Math.ceil(timeLeft / 1000);
            return res.status(429).json({
                error: `Cooldown active. Please wait ${secondsLeft} seconds before sending another message.`,
                cooldownSeconds: secondsLeft
            });
        }

        let conversation;
        if (conversationId) {
            conversation = await Conversation.findOne({ _id: conversationId, userId });
        }

        if (!conversation) {
            // Create new conversation
            const title = text.split(' ').slice(0, 5).join(' ') + (text.split(' ').length > 5 ? '...' : '');
            conversation = new Conversation({ userId, title });
            await conversation.save();
        } else {
            conversation.updatedAt = new Date();
            await conversation.save();
        }

        // 1. Save User Message
        const userMsg = new Chat({ userId, conversationId: conversation._id, role: 'user', text });
        await userMsg.save();

        // 2. Fetch Recent History for Context
        const recentChats = await Chat.find({
            userId,
            conversationId: conversation._id
        }).sort({ timestamp: -1 }).limit(10);

        const history = recentChats.reverse().map(c => ({
            role: c.role,
            parts: [{ text: c.text }]
        }));

        // 3. CHECK CACHE FIRST
        const normalizedInput = text.trim().toLowerCase().replace(/[?.,!]/g, '');
        const cachedResponse = await FaqCache.findOne({ question: normalizedInput });

        let aiText;
        if (cachedResponse) {
            aiText = cachedResponse.answer;
            // Update hit count
            await FaqCache.updateOne({ question: normalizedInput }, { $inc: { hits: 1 } });
        } else if (provider === 'gemini') {
            aiText = await callGemini(history);
        } else {
            // Default to 'llama' (Div.ai)
            aiText = await callGroq(history);
        }

        // 4. Update Query Analytics & Save to FAQ Cache
        if (!cachedResponse) {
            // Update Analytics
            await QueryAnalytics.findOneAndUpdate(
                { question: normalizedInput },
                {
                    $inc: { frequency: 1 },
                    $set: { lastAsked: new Date() }
                },
                { upsert: true }
            );

            // AUTO-CACHE: Save the new Q&A to FaqCache
            try {
                await new FaqCache({
                    question: normalizedInput,
                    answer: aiText,
                    hits: 1
                }).save();
                console.log(`[CACHE SAVE] Saved new FAQ: "${normalizedInput}"`);
            } catch (err) {
                // Ignore duplicates or errors
                console.error("Cache save error:", err.message);
            }
        }

        const aiMsg = new Chat({ userId, conversationId: conversation._id, role: 'model', text: aiText });
        await aiMsg.save();

        // Update chat counter only for non-cached responses
        if (!cachedResponse) {
            currentUser.chatCount += 1;
            currentUser.lastChatTime = new Date();
            try {
                await currentUser.save();
            } catch (saveErr) {
                console.error("⚠️ Failed to update user stats (ignoring):", saveErr.message);
                // Continue without failing the request
            }
        }

        const userForEmail = await User.findById(userId);

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: 'canvadwala@gmail.com',
            subject: `New Chat (${provider || 'gemini'}): ${userForEmail.username}`,
            html: `<h3>${conversation.title}</h3><p>Q: ${text}</p><p>A: ${aiText}</p>`
        };

        try { await transporter.sendMail(mailOptions); } catch (e) { }

        res.json({ text: aiText, conversationId: conversation._id });

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
