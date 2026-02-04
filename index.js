require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const Database = require('better-sqlite3');

const db = new Database('cache.db');

// Initialize FAQ Cache Table
db.exec(`
  CREATE TABLE IF NOT EXISTS faq_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT UNIQUE COLLATE NOCASE,
    answer TEXT,
    hits INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Pre-seed common FAQs
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

const insertFaq = db.prepare('INSERT OR IGNORE INTO faq_cache (question, answer) VALUES (?, ?)');
seedFAQs.forEach(faq => insertFaq.run(faq.q, faq.a));

// Initialize Query Analytics Table
db.exec(`
  CREATE TABLE IF NOT EXISTS query_analytics (
    question TEXT PRIMARY KEY,
    frequency INTEGER DEFAULT 1,
    last_asked DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const JWT_SECRET = process.env.JWT_SECRET || 'div_ai_secret_key_123';

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

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Request Logger
app.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.url}`);
    next();
});

// MongoDB Connection Helper (Caching for Serverless)
let cachedConnection = null;
const connectDB = async () => {
    if (cachedConnection) return cachedConnection;
    if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI is missing in Vercel Environment Variables');
    }

    try {
        console.log('🔄 Connecting to MongoDB...');
        // Setting bufferCommands to false makes errors appear immediately
        mongoose.set('bufferCommands', false);

        cachedConnection = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
        });

        console.log('✅ Connected to MongoDB');
        return cachedConnection;
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err.message);
        throw err;
    }
};

// Admin User Initialization
const initAdminUser = async () => {
    try {
        await connectDB();
        const adminExists = await User.findOne({ username: 'div.ai' });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('111', 10);
            const admin = new User({
                username: 'div.ai',
                email: 'divyeshh099@gmail.com',
                password: hashedPassword
            });
            await admin.save();
            console.log('👤 [ADMIN] Admin user created: div.ai');
        }
    } catch (e) { console.error('❌ Admin Init Error:', e); }
};
initAdminUser();

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

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    resetOTP: String,
    resetOTPExpires: Date,
    lastChatReset: { type: Date, default: Date.now }
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
    role: { type: String, required: true }, // 'user' or 'model'
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const Chat = mongoose.model('Chat', chatSchema);

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
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Div.ai Password Reset OTP',
            text: `Your OTP is ${otp}.\nIt is valid for 5 minutes.\nDo not share this OTP with anyone.`
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
app.get('/api/admin/stats', verifyToken, (req, res) => {
    try {
        const topFaqs = db.prepare('SELECT * FROM faq_cache ORDER BY hits DESC LIMIT 20').all();
        const topQueries = db.prepare('SELECT * FROM query_analytics ORDER BY frequency DESC LIMIT 20').all();
        const totalFaqs = db.prepare('SELECT COUNT(*) as count FROM faq_cache').get().count;
        const totalHits = db.prepare('SELECT SUM(hits) as count FROM faq_cache').get().count || 0;

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
    const response = await fetch(`${process.env.GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: history,
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            generationConfig: { temperature: 0.7 }
        })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Gemini API Error');
    return data.candidates[0].content.parts[0].text;
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
    if (!response.ok) throw new Error(data.error?.message || 'Groq API Error');
    return data.choices[0].message.content;
}

// 2. Send Message & Get AI Response (Protected)
app.post('/api/chat', verifyToken, async (req, res) => {
    const { text, conversationId, provider } = req.body;
    const userId = req.user.userId;

    if (!text) return res.status(400).json({ error: 'Message is required' });

    try {
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
        const cachedResponse = db.prepare('SELECT answer FROM faq_cache WHERE question = ?').get(normalizedInput);

        let aiText;
        if (cachedResponse) {
            aiText = cachedResponse.answer;
            // Update hit count
            db.prepare('UPDATE faq_cache SET hits = hits + 1 WHERE question = ?').run(normalizedInput);
        } else if (provider === 'llama') {
            aiText = await callGroq(history);
        } else {
            aiText = await callGemini(history);
        }

        // 4. Update Query Analytics (Optional: only if not already in FAQ cache)
        if (!cachedResponse) {
            db.prepare(`
                INSERT INTO query_analytics (question, frequency, last_asked) 
                VALUES (?, 1, CURRENT_TIMESTAMP)
                ON CONFLICT(question) DO UPDATE SET 
                frequency = frequency + 1,
                last_asked = CURRENT_TIMESTAMP
            `).run(normalizedInput);
        }

        const aiMsg = new Chat({ userId, conversationId: conversation._id, role: 'model', text: aiText });
        await aiMsg.save();

        const user = await User.findById(userId);

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: 'canvadwala@gmail.com',
            subject: `New Chat (${provider || 'gemini'}): ${user.username}`,
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
