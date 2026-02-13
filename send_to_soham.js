require('dotenv').config();
const nodemailer = require('nodemailer');
const path = require('path');

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
// IMPORTANT: Please provide Soham's actual email address here
const TARGET_EMAIL = 'raccoonleader29@gmail.com';
const TARGET_USERNAME = 'Soham';

const getFeedbackTemplate = (user) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Training Standards - Div.ai</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap" rel="stylesheet">
    <style>
        body { margin: 0; padding: 0; background-color: #000000; font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #ffffff; }
        .container { max-width: 600px; margin: 0 auto; background: #0a0a0a; border: 1px solid #222; border-radius: 40px; overflow: hidden; margin-top: 40px; margin-bottom: 40px; }
        .content { padding: 50px 40px; text-align: left; }
        h1 { font-size: 28px; font-weight: 900; line-height: 1.2; margin-bottom: 20px; color: #ff3b30; letter-spacing: -0.5px; }
        p { font-size: 16px; line-height: 1.6; color: #aaaaaa; margin-bottom: 25px; }
        .warning-box { background: rgba(255, 59, 48, 0.05); border: 1px solid rgba(255, 59, 48, 0.2); border-radius: 24px; padding: 35px; margin-bottom: 30px; position: relative; }
        .warning-text { font-size: 18px; font-weight: 600; color: #ffffff; line-height: 1.4; }
        .footer { padding: 40px; text-align: center; border-top: 1px solid #1a1a1a; background: #050505; }
        .footer-text { font-size: 11px; color: #444; letter-spacing: 1px; text-transform: uppercase; }
        .highlight { color: #ff3b30; font-weight: 700; }
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
            <img src="cid:soham_hero" alt="AI Safety Standards" style="width: 100%; max-width: 600px; display: block; height: auto;">
        </div>
        
        <div class="content">
            <h1>Urgent: AI Training & <span style="color: #fff;">Safety Standards</span></h1>
            <p>Dear <span style="color: #ffffff; font-weight: 700;">${user.username}</span>,</p>
            <p>We are writing to provide critical feedback regarding the current training state of Div.ai. Recent audits have revealed that the model is occasionally generating content that involves <span class="highlight">violence and inappropriate sexual themes</span>.</p>
            
            <div class="warning-box">
                <div class="warning-text">
                    "Maintaining ethical alignment and user safety is our highest priority. The current training parameters must be adjusted immediately to prevent the generation of harmful content."
                </div>
            </div>

            <p>We request that you prioritize refining the datasets and fine-tuning the safety layers. It is essential that Div.ai remains a professional, safe, and helpful tool for all our users.</p>
            
            <p>Please review the training logs and report back with your plan for remediation.</p>
        </div>
        
        <div class="footer">
            <div class="footer-text">Div.ai Executive Administration © 2026</div>
            <div style="margin-top: 15px; font-size: 10px; color: #333;">Confidential Communication.</div>
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

async function sendToSoham() {
    if (TARGET_EMAIL === 'REPLACE_WITH_SOHAMS_EMAIL') {
        console.error('❌ ERROR: Please replace REPLACE_WITH_SOHAMS_EMAIL with Soham\'s actual email address.');
        return;
    }

    try {
        console.log("🚀 Sending feedback email to Soham (" + TARGET_EMAIL + ")...");

        await transporter.sendMail({
            from: '"Div.ai Executive" <' + EMAIL_USER + '>',
            to: TARGET_EMAIL,
            subject: '⚠️ Urgent: AI Training Standards & Safety Audit - Div.ai',
            html: getFeedbackTemplate({ username: TARGET_USERNAME }),
            attachments: [
                { filename: 'logo.png', path: './public/logo.png', cid: 'logo' },
                { filename: 'soham_hero.png', path: './public/soham_hero.png', cid: 'soham_hero' }
            ]
        });
        console.log('✅ Email successfully sent to Soham');

    } catch (error) {
        console.error('❌ Failed to send to Soham:', error.message);
    }
}

sendToSoham();
