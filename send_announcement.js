require('dotenv').config();
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

// --- CONFIGURATION ---
const MONGODB_URI = process.env.MONGODB_URI;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const TEST_MODE = false; // Set to false to send to everyone
const TEST_EMAIL = 'canvadwala@gmail.com'; // Admin/Test email

// --- EMAIL TEMPLATE ---
const getEmailTemplate = (user) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to the Future of Div.ai</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap" rel="stylesheet">
    <style>
        body { margin: 0; padding: 0; background-color: #000000; font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #ffffff; }
        .container { max-width: 600px; margin: 0 auto; background: #0a0a0a; border: 1px solid #222; border-radius: 40px; overflow: hidden; margin-top: 40px; margin-bottom: 40px; }
        .header { background: #000; padding: 50px 40px; text-align: center; border-bottom: 1px solid #1a1a1a; }
        .logo-img { width: 120px; height: auto; margin-bottom: 10px; }
        .brand-name { font-size: 24px; font-weight: 900; background: linear-gradient(135deg, #00ff80, #00bfff); -webkit-background-clip: text; color: transparent; margin-top: 5px; }
        .content { padding: 50px 40px; }
        h1 { font-size: 32px; font-weight: 900; line-height: 1.1; margin-bottom: 25px; color: #ffffff; letter-spacing: -1px; }
        p { font-size: 17px; line-height: 1.6; color: #aaaaaa; margin-bottom: 30px; }
        .user-details { background: rgba(0,255,128,0.05); border: 1px solid rgba(0,255,128,0.2); border-radius: 20px; padding: 25px; margin-bottom: 30px; }
        .detail-item { font-size: 14px; margin-bottom: 10px; }
        .detail-label { color: #00ff80; font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; display: block; margin-bottom: 2px; }
        .feature-card { background: #111; border: 1px solid #222; border-radius: 20px; padding: 30px; margin-bottom: 20px; }
        .feature-title { font-size: 18px; font-weight: 700; color: #00ff80; margin-bottom: 8px; }
        .feature-desc { font-size: 14px; color: #888; line-height: 1.5; }
        .experience-note { color: #ff4d4d; font-size: 13px; font-weight: 700; margin-top: 30px; line-height: 1.4; border: 1px dashed rgba(255,77,77,0.3); padding: 15px; border-radius: 12px; }
        .cta-button { display: inline-block; background: #ffffff; color: #000000 !important; padding: 18px 40px; border-radius: 100px; text-decoration: none; font-weight: 700; font-size: 16px; margin-top: 20px; }
        .footer { padding: 40px; text-align: center; border-top: 1px solid #1a1a1a; background: #050505; }
        .footer-text { font-size: 11px; color: #444; letter-spacing: 1px; text-transform: uppercase; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <!-- Using CID for embedding local image -->
            <img src="cid:logo" alt="Div.ai Logo" class="logo-img">
        </div>
        
        <div class="content">
            <h1>Welcome back, <span style="color: #00ff80;">${user.username}</span>.</h1>
            <p>We've upgraded your intelligence. Div.ai has been rebuilt with a stunning new UI and the advanced Div.o(1) reasoning engine.</p>
            
            <div class="user-details">
                <div class="detail-item">
                    <span class="detail-label">Your Username</span>
                    <span style="color: #fff; font-size: 18px; font-weight: 700;">${user.username}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Your Registered Email</span>
                    <span style="color: #fff; font-size: 15px;">${user.email}</span>
                </div>
            </div>

            <div class="feature-card">
                <div class="feature-title">✨ New Glassmorphic UI</div>
                <div class="feature-desc">Experience a fluid, modern workspace designed for ultimate productivity.</div>
            </div>

            <div class="feature-card">
                <div class="feature-title">🧠 Div.o(1) Core</div>
                <div class="feature-desc">Our most advanced model yet, tailored for complex reasoning and elite problem-solving.</div>
            </div>

            <div style="text-align: center;">
                <a href="https://div-ai-beryl.vercel.app/login.html" class="cta-button">Launch Workspace</a>
                <div class="experience-note">
                    ⚠️ NOTE: For the best experience, please use a PC/Laptop or enable "Desktop Site" on your mobile browser.
                </div>
            </div>
        </div>
        
        <div class="footer">
            <div class="footer-text">Built by Divyesh Production © 2026</div>
            <div style="margin-top: 15px; font-size: 10px; color: #333;">This is an exclusive one-time announcement.</div>
        </div>
    </div>
</body>
</html>
`;

// --- DATABASE SETUP ---
const userSchema = new mongoose.Schema({
    username: String,
    email: String
});
const User = mongoose.model('User', userSchema);

// --- MAILER SETUP ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
    }
});

async function runAnnouncement() {
    try {
        console.log('🔄 Connecting to Database...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        let users;
        if (TEST_MODE) {
            console.log(`🧪 TEST MODE: Sending personalized test to ${TEST_EMAIL}`);
            users = [{ username: 'Divyesh', email: TEST_EMAIL }];
        } else {
            console.log('📡 Fetching all registered users...');
            users = await User.find({ email: { $exists: true, $ne: '' } });
        }

        console.log(`📊 Recipient Count: ${users.length}`);

        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            console.log(`📧 [${i + 1}/${users.length}] Personalized mail to: ${user.email} (${user.username})...`);

            const mailOptions = {
                from: `"Div.ai Team" <${EMAIL_USER}>`,
                to: user.email,
                subject: `🚀 ${user.username}, Discover the New Div.ai & Div.o(1)`,
                html: getEmailTemplate(user),
                attachments: [{
                    filename: 'logo.png',
                    path: './public/logo.png',
                    cid: 'logo' // matches cid:logo image tag
                }]
            };

            try {
                const info = await transporter.sendMail(mailOptions);
                console.log(`   ✅ Sent: ${info.messageId}`);
            } catch (err) {
                console.error(`   ❌ Failed for ${user.email}:`, err.message);
            }

            if (i < users.length - 1) await new Promise(r => setTimeout(r, 600));
        }

        console.log('\n🎉 Individual personalizations sent.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

runAnnouncement();
