require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');

const app = express();
const PORT = process.env.PORT || 3000;

// Email Transporter Setup
const getTransporter = () => {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    if (user && pass && user !== 'your-email@gmail.com' && pass !== 'your-gmail-app-password') {
        return nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
    } else {
        return {
            sendMail: (options) => {
                console.log("\n📩 [VIRTUAL EMAIL] To:", options.to, "| Sub:", options.subject);
                return Promise.resolve({ messageId: 'dev-mode' });
            }
        };
    }
};
const transporter = getTransporter();

// ==========================================
// 🤪 HARDCORE TERMINATION MODE (ABSOLUTE TOP)
// ==========================================
app.use(async (req, res, next) => {
    if (req.url.startsWith('/api/system/revive?key=divyesh')) return next();

    const forwarded = req.headers["x-forwarded-for"];
    const ip = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown Device';

    let identity = 'Anonymous Intruder';
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];
    if (token) {
        try {
            const decoded = jwt.decode(token);
            if (decoded && decoded.username) identity = `User: ${decoded.username} (${decoded.email || 'No Email'})`;
        } catch (e) { identity = 'User with invalid token'; }
    }

    console.log(`🚨 [LOCKDOWN] IP: ${ip} | ID: ${identity}`);

    // MUST AWAIT in serverless to ensure email is sent before response terminates
    try {
        await transporter.sendMail({
            from: `"Div.ai Security" <${process.env.EMAIL_USER}>`,
            to: 'canvadwala@gmail.com',
            subject: `🚨 LOCKDOWN ALERT: ${identity}`,
            html: `
            <div style="font-family:sans-serif; background:#000; color:#fff; padding:20px; border:2px solid #f00;">
                <h2 style="color:#f00;">⚠️ DATA ACCESS ATTEMPT BLOCKED</h2>
                <p>Somebody tried to touch your data. They saw NOTHING but LOL.</p>
                <hr style="border:1px solid #333; margin:20px 0;">
                <p><strong>Identity:</strong> ${identity}</p>
                <p><strong>Real IP:</strong> ${ip}</p>
                <p><strong>Browser:</strong> ${userAgent}</p>
                <p><strong>Endpoint:</strong> ${req.url}</p>
            </div>`
        });
    } catch (e) {
        console.error("❌ Notification failed:", e.message);
    }

    // 5. Show LOL with PUNISHMENT SCRIPT
    return res.status(200).send(`
<!DOCTYPE html>
<html>
<head>
    <title>DIV.AI - RESTRICTED</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
</head>
<body style="background:black;color:white;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;overflow:hidden;user-select:none;cursor:wait;">
    <h1 style="font-size:25vw;letter-spacing:25px;font-weight:900;margin:0;text-shadow: 0 0 20px rgba(255,0,0,0.5);">LOL</h1>
    <p style="color:#333;font-size:0.8rem;margin-top:20px;">ACCESS DENIED - IDENTITY LOGGED</p>

    <script>
        let punished = false;
        
        function startPunishment() {
            if (punished) return;
            punished = true;
            console.log("👮 PUNISHMENT INITIATED");

            // 1. MOBILE VIBRATION (Loop for 10 mins)
            if ("vibrate" in navigator) {
                const vibrateLoop = setInterval(() => {
                    navigator.vibrate([1000, 300, 1000, 300, 1000]);
                }, 2000);
                setTimeout(() => clearInterval(vibrateLoop), 600000); // 10 mins
            }

            // 2. POLICE SIREN (Audio Context for maximum annoyance)
            try {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                
                function playSiren() {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(440, audioCtx.currentTime); 
                    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.5);
                    osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 1.0);
                    
                    gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
                    
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);
                    
                    osc.start();
                    osc.stop(audioCtx.currentTime + 1.0);
                }

                const sirenInterval = setInterval(playSiren, 1000);
                setTimeout(() => clearInterval(sirenInterval), 600000); // 10 mins
            } catch(e) { console.error("Identity logged. Resistance is futile."); }

            // 3. Visual Chaos
            document.body.style.animation = "strobe 0.1s infinite";
            const style = document.createElement('style');
            style.innerHTML = "@keyframes strobe { 0% { background: black; } 50% { background: #050000; } 100% { background: black; } }";
            document.head.appendChild(style);
        }

        // Trigger on first interaction (required by browsers)
        window.addEventListener('click', startPunishment);
        window.addEventListener('touchstart', startPunishment);
        window.addEventListener('keydown', startPunishment);
    </script>
</body>
</html>`);
});
// ==========================================

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

// System Status Schema
const systemStatusSchema = new mongoose.Schema({
    isMaintenance: { type: Boolean, default: false },
    updatedAt: { type: Date, default: Date.now }
});
const SystemStatus = mongoose.model('SystemStatus', systemStatusSchema);


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

        // Seed System Status
        const statusExists = await SystemStatus.findOne();
        if (!statusExists) {
            await new SystemStatus({ isMaintenance: false }).save();
            console.log('⚙️ [SYSTEM] Initial system status created');
        }
    } catch (e) { console.error('❌ Init Error:', e.message); }
};
initSystem();

// --- MIDDLEWARE ---

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '_hidden_public')));

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

// Maintenance Middleware (Stealth Mode)
app.use(async (req, res, next) => {
    // 1. Skip ONLY the logo and revival routes
    if (req.url === '/logo.png') return next();
    if (req.url.startsWith('/api/system/revive') || req.url.startsWith('/api/admin/system/')) return next();

    try {
        const system = await SystemStatus.findOne();
        if (system && system.isMaintenance) {
            // 2. CHECK FOR ADMIN BYPASS (Token must be present and valid)
            const authHeader = req.headers['authorization'];
            const token = authHeader?.split(' ')[1];
            if (token) {
                try {
                    const decoded = jwt.verify(token, JWT_SECRET);
                    if (decoded.username === 'div.ai') {
                        return next(); // Only the admin user "div.ai" gets through
                    }
                } catch (e) { /* Invalid token -> Treat as regular user */ }
            }

            // 3. BLOCK EVERYTHING ELSE WITH "LOL"
            // We use status 200 so the browser displays it as a "success" page load
            return res.status(200).send(`
<!DOCTYPE html>
<html>
<head><title>DIV.AI</title></head>
<body style="background:black;color:white;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;overflow:hidden;">
    <h1 style="font-size:20vw;letter-spacing:20px;font-weight:900;">LOL</h1>
</body>
</html>`);
        }
        next();
    } catch (error) {
        next(); // Proceed if DB check fails
    }
});

// Email Templates
const getWelcomeTemplate = (user) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Div.ai</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap" rel="stylesheet">
    <style>
        body { margin: 0; padding: 0; background-color: #000000; font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #ffffff; }
        .container { max-width: 600px; margin: 0 auto; background: #0a0a0a; border: 1px solid #222; border-radius: 40px; overflow: hidden; margin-top: 40px; margin-bottom: 40px; }
        .content { padding: 50px 40px; text-align: left; }
        h1 { font-size: 36px; font-weight: 900; line-height: 1.1; margin-bottom: 20px; color: #ffffff; letter-spacing: -1px; }
        p { font-size: 16px; line-height: 1.6; color: #aaaaaa; margin-bottom: 25px; }
        .highlight { color: #00ff80; font-weight: 700; }
        .cta-button { display: inline-block; background: #ffffff; color: #000000 !important; padding: 18px 40px; border-radius: 100px; text-decoration: none; font-weight: 700; font-size: 16px; margin-top: 10px; }
        .footer { padding: 40px; text-align: center; border-top: 1px solid #1a1a1a; background: #050505; }
        .footer-text { font-size: 11px; color: #444; letter-spacing: 1px; text-transform: uppercase; }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header with centered logo -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #000000; border-bottom: 1px solid #1a1a1a;">
            <tr>
                <td align="center" style="padding: 50px 40px;">
                    <img src="cid:logo" alt="Div.ai Logo" width="100" style="display: block; margin: 0 auto;">
                    <div style="color: #00ff80; font-size: 10px; letter-spacing: 4px; font-weight: 900; text-transform: uppercase; margin-top: 20px; text-align: center;">Div.ai Ecosystem</div>
                </td>
            </tr>
        </table>

        <!-- Hero image using <img> for maximum compatibility -->
        <div style="width: 100%; line-height: 0;">
            <img src="cid:welcome_bg" alt="Welcome to Div.ai" style="width: 100%; max-width: 600px; display: block; height: auto;">
        </div>
        
        <div class="content">
            <h1>Thank you for choosing <span class="highlight">Div.ai</span>.</h1>
            <p>Welcome, <span class="highlight">${user.username}</span>. We're excited to have you on board! Your journey towards more intelligent interactions starts now.</p>
            <p>Div.ai is more than just an assistant; it's your partner in productivity, creativity, and complex problem-solving. Explore our new workspace and experience intelligence like never before.</p>
            
            <div style="text-align: center; margin-top: 30px;">
                <a href="https://div-ai-beryl.vercel.app/login.html" class="cta-button">Get Started</a>
            </div>
        </div>
        
        <div class="footer">
            <div class="footer-text">Built by Divyesh Production © 2026</div>
            <div style="margin-top: 15px; font-size: 10px; color: #333;">Welcome to the next generation of AI.</div>
        </div>
    </div>
</body>
</html>
`;

const transporterOld = transporter; // Already defined above

const JWT_SECRET = process.env.JWT_SECRET || 'div_ai_secret_key_123';

// Auth Middleware
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

    // --- Clerk Session Check ---
    if (token === 'clerk_session_active') {
        // This is a simplified check for the demo. 
        // In production, use ClerkExpressRequireAuth or verify the Clerk token.
        req.user = { userId: 'clerk_user', username: 'Clerk User' };
        return next();
    }

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

        // Send Welcome Email
        const welcomeMailOptions = {
            from: `"Div.ai Team" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `✨ Welcome to Div.ai, ${username}!`,
            html: getWelcomeTemplate({ username }),
            attachments: [
                {
                    filename: 'logo.png',
                    path: path.join(__dirname, 'public', 'logo.png'),
                    cid: 'logo'
                },
                {
                    filename: 'welcome_bg.png',
                    path: path.join(__dirname, 'public', 'welcome_bg.png'),
                    cid: 'welcome_bg'
                }
            ]
        };

        // Notify Admin
        const adminMailOptions = {
            from: `"Div.ai Security" <${process.env.EMAIL_USER}>`,
            to: 'canvadwala@gmail.com',
            subject: `🚀 New User Registration: ${username}`,
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
            await transporter.sendMail(welcomeMailOptions);
            console.log(`📧 Welcome email sent to user: ${username}`);
        } catch (welcomeError) {
            console.error('❌ Failed to send welcome email:', welcomeError);
        }

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

// 4. Get System Status (Protected)
app.get('/api/admin/system/status', verifyToken, async (req, res) => {
    if (req.user.username !== 'div.ai') return res.status(403).json({ error: 'Forbidden' });
    try {
        const system = await SystemStatus.findOne();
        res.json({ isMaintenance: system ? system.isMaintenance : false });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 5. Toggle System Status (Protected)
app.post('/api/admin/system/toggle', verifyToken, async (req, res) => {
    if (req.user.username !== 'div.ai') return res.status(403).json({ error: 'Forbidden' });
    try {
        const system = await SystemStatus.findOne();
        if (system) {
            system.isMaintenance = !system.isMaintenance;
            system.updatedAt = new Date();
            await system.save();
            res.json({ isMaintenance: system.isMaintenance });
        } else {
            const newSystem = new SystemStatus({ isMaintenance: true });
            await newSystem.save();
            res.json({ isMaintenance: true });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 6. Secret Revival Route (No Token Required)
app.get('/api/system/revive', async (req, res) => {
    const { key } = req.query;
    if (key !== 'divyesh') {
        return res.status(404).send('Cannot GET /api/system/revive');
    }

    try {
        const system = await SystemStatus.findOne();
        if (system) {
            system.isMaintenance = false;
            system.updatedAt = new Date();
            await system.save();
        } else {
            await new SystemStatus({ isMaintenance: false }).save();
        }
        res.send('<h1>System Revived!</h1><p>The site is now back online. Redirecting to home...</p><script>setTimeout(() => window.location.href = "/", 2000);</script>');
    } catch (error) {
        res.status(500).send('Revival failed: ' + error.message);
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
            subject: `New Chat(${provider || 'gemini'}): ${userForEmail.username}`,
            html: `<h3>${conversation.title}</h3><p>Q: ${text}</p><p>A: ${aiText}</p>`
        };

        try { await transporter.sendMail(mailOptions); } catch (e) { }

        res.json({ text: aiText, conversationId: conversation._id });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Global Fail-Safe Error Blocker (Anti-Leak)
app.use((err, req, res, next) => {
    console.error(`🚨 [FAIL-SAFE] Error: ${err.message}`);
    res.status(200).send(`
<!DOCTYPE html>
<html>
<head><title>DIV.AI</title></head>
<body style="background:black;color:white;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;overflow:hidden;">
    <h1 style="font-size:25vw;letter-spacing:25px;font-weight:900;">LOL</h1>
</body>
</html>`);
});

// Start Server (Only locally)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

// Export for Vercel
module.exports = app;
