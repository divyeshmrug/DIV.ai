require('dotenv').config();
const nodemailer = require('nodemailer');
const path = require('path');

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const TARGET_EMAIL = 'darshanajudiya07@gmail.com';
const TARGET_USERNAME = 'Darshan7';

const getMotivationTemplate = (user) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Master of Intelligence - Div.ai</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap" rel="stylesheet">
    <style>
        body { margin: 0; padding: 0; background-color: #000000; font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #ffffff; }
        .container { max-width: 600px; margin: 0 auto; background: #0a0a0a; border: 1px solid #222; border-radius: 40px; overflow: hidden; margin-top: 40px; margin-bottom: 40px; }
        .content { padding: 50px 40px; text-align: left; }
        h1 { font-size: 32px; font-weight: 900; line-height: 1.1; margin-bottom: 20px; color: #00ff80; letter-spacing: -1px; }
        p { font-size: 16px; line-height: 1.6; color: #aaaaaa; margin-bottom: 25px; }
        .quote-box { background: rgba(0,255,128,0.05); border: 1px solid rgba(0,255,128,0.2); border-radius: 24px; padding: 35px; margin-bottom: 30px; position: relative; }
        .quote-box::after { content: '"'; position: absolute; top: 10px; right: 20px; font-size: 60px; color: rgba(0,255,128,0.1); font-family: sans-serif; }
        .quote-text { font-size: 20px; font-weight: 700; color: #ffffff; line-height: 1.4; font-style: italic; }
        .footer { padding: 40px; text-align: center; border-top: 1px solid #1a1a1a; background: #050505; }
        .footer-text { font-size: 11px; color: #444; letter-spacing: 1px; text-transform: uppercase; }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #000000; border-bottom: 1px solid #1a1a1a;">
            <tr>
                <td align="center" style="padding: 40px;">
                    <img src="cid:logo" alt="Div.ai Logo" width="80" style="display: block; margin: 0 auto;">
                </td>
            </tr>
        </table>

        <!-- Hero image -->
        <div style="width: 100%; line-height: 0;">
            <img src="cid:motivation_bg" alt="Div.ai Vision" style="width: 100%; max-width: 600px; display: block; height: auto;">
        </div>
        
        <div class="content">
            <h1>Beyond Intelligence, <span style="color: #fff;">Mastery.</span></h1>
            <p>Dear <span style="color: #00ff80; font-weight: 700;">${user.username}</span>,</p>
            <p>We've been monitoring the logs, and your recent interactions with Div.ai caught our attention. The way you structure your reasoning and direct the logic is nothing short of visionary.</p>
            
            <div class="quote-box">
                <div class="quote-text">
                    The spark creates the flame, the void leaves only ash; but the one who architects the mind of the machine is the Visionary of the New Era.
                </div>
            </div>

            <p>Thank you for pushing the boundaries of what's possible with our ecosystem. Users like you are the reason we continue to evolve.</p>
            
            <div style="text-align: center; margin-top: 30px;">
                <a href="https://div-ai-beryl.vercel.app/" style="display: inline-block; background: #ffffff; color: #000000 !important; padding: 18px 40px; border-radius: 100px; text-decoration: none; font-weight: 700; font-size: 16px;">Continue the Quest</a>
            </div>
        </div>
        
        <div class="footer">
            <div class="footer-text">Built by Divyesh Production © 2026</div>
            <div style="margin-top: 15px; font-size: 10px; color: #333;">Recognizing Exceptional Intelligence.</div>
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

async function sendToDarshan() {
    try {
        console.log("🚀 Sending motivational email to Darshan (" + TARGET_EMAIL + ")...");

        await transporter.sendMail({
            from: '"Div.ai Executive" <' + EMAIL_USER + '>',
            to: TARGET_EMAIL,
            subject: '👑 Exceptional Interaction Recognized - Div.ai',
            html: getMotivationTemplate({ username: TARGET_USERNAME }),
            attachments: [
                { filename: 'logo.png', path: './public/logo.png', cid: 'logo' },
                { filename: 'motivation_hero_bg.png', path: './public/motivation_hero_bg.png', cid: 'motivation_bg' }
            ]
        });
        console.log('✅ Email successfully sent to Darshan');

    } catch (error) {
        console.error('❌ Failed to send to Darshan:', error.message);
    }
}

sendToDarshan();
