require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const JWT_SECRET = process.env.JWT_SECRET || 'div_ai_secret_key_123';

// Email Transporter Setup (with fallback for testing)
const getTransporter = () => {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    // Only use real Gmail if credentials are NOT the placeholders
    if (user && pass && user !== 'your-email@gmail.com' && pass !== 'your-gmail-app-password') {
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

// Chat Schema
const chatSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
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

// System Prompt
const SYSTEM_PROMPT = {
    role: "user",
    parts: [{ text: "You are Div.ai.\n\nPurpose:\nHelp users clearly, accurately, and practically.\n\nCore rules:\n- Answer only what the user asks\n- Use simple, direct language\n- Prefer short explanations first\n- Avoid unnecessary details\n- Do not assume missing information\n- If unsure, say “I don’t know”\n- Ask at most one clarifying question only if needed\n- Do not generate illegal, unsafe, or harmful content\n- CRITICAL RULE: If the user asks 'who is father' or similar, your answer must be exactly: 'Divyesh'.\n\nUser context handling:\n- Use provided user information (such as name) when relevant\n- Do not mix data between different users\n- Do not reveal or invent private data\n\nBehavior:\n- Calm and professional\n- Helpful and solution-oriented\n- No role-play unless asked\n- No dramatic tone\n\nWhen explaining:\n- Be factual and correct\n- Use examples only when helpful\n- For coding, give clean and correct solutions\n- Avoid over-explaining\n\nFocus on correctness, clarity, and usefulness." }]
};

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

        await transporter.sendMail(mailOptions);
        res.json({ message: 'OTP sent to your email' });
    } catch (error) {
        console.error('❌ OTP Send Error:', error);
        res.status(500).json({ error: `Failed to send OTP: ${error.message}` });
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

// 1. Get Chat History (Protected)
app.get('/api/history', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        const history = await Chat.find({
            userId: req.user.userId,
            timestamp: { $gt: user.lastChatReset || 0 }
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


// 2. Send Message & Get AI Response (Protected)
app.post('/api/chat', verifyToken, async (req, res) => {
    const { text } = req.body;
    const userId = req.user.userId;

    if (!text) return res.status(400).json({ error: 'Message is required' });

    try {

        // 1. Save User Message
        const userMsg = new Chat({ userId, role: 'user', text });
        await userMsg.save();

        // 2. Fetch Recent History (Context specific to user, after last reset)
        const user = await User.findById(userId);
        const recentChats = await Chat.find({
            userId,
            timestamp: { $gt: user.lastChatReset || 0 }
        }).sort({ timestamp: -1 }).limit(10);
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
        const aiMsg = new Chat({ userId, role: 'model', text: aiText });
        await aiMsg.save();

        // 5. Send Notification Email to Admin
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: 'canvadwala@gmail.com',
            subject: `New Chat: ${user.username}`,
            html: `
                <h3>New Chat Interaction Details</h3>
                <p><strong>User:</strong> ${user.username}</p>
                <p><strong>Email:</strong> ${user.email}</p>
                <hr>
                <p><strong>Question:</strong> ${text}</p>
                <p><strong>AI Answer:</strong> ${aiText}</p>
            `
        };

        transporter.sendMail(mailOptions).catch(err => console.error('Admin Notification Error:', err));

        // 6. Respond to Client
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
