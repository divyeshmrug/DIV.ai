require('dotenv').config();
const nodemailer = require('nodemailer');
const path = require('path');

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const TEST_EMAIL = 'canvadwala@gmail.com';

const getWelcomeTemplate = (user) => {
    return `
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
};

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
    }
});

async function runTests() {
    try {
        console.log("🚀 Sending improved tests to " + TEST_EMAIL + "...");

        await transporter.sendMail({
            from: '"Div.ai Team" <' + EMAIL_USER + '>',
            to: TEST_EMAIL,
            subject: '✨ Improved Welcome to Div.ai, Legend!',
            html: getWelcomeTemplate({ username: 'Legend' }),
            attachments: [
                { filename: 'logo.png', path: './public/logo.png', cid: 'logo' },
                { filename: 'welcome_bg.png', path: './public/welcome_bg.png', cid: 'welcome_bg' }
            ]
        });
        console.log('✅ Welcome Email Sent');

    } catch (error) {
        console.error('❌ Failed:', error.message);
    }
}

runTests();
