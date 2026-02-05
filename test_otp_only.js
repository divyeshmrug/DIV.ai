require('dotenv').config();
const nodemailer = require('nodemailer');

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const TEST_EMAIL = 'canvadwala@gmail.com';

const getOtpTemplate = (otp) => {
    return `
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
`;
};

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
    }
});

async function sendOtpTest() {
    try {
        console.log("🚀 Sending OTP test to " + TEST_EMAIL + "...");

        await transporter.sendMail({
            from: '"Div.ai Security" <' + EMAIL_USER + '>',
            to: TEST_EMAIL,
            subject: '🔐 Your Super Login ID',
            html: getOtpTemplate('123456')
        });
        console.log('✅ OTP Test Email Sent');

    } catch (error) {
        console.error('❌ Failed:', error.message);
    }
}

sendOtpTest();
