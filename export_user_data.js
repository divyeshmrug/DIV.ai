require('dotenv').config();
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

// MongoDB Connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err.message);
        process.exit(1);
    }
};

// --- SCHEMAS ---
const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: { type: String, select: true }
});
const User = mongoose.model('User_Export', userSchema, 'users');

const chatSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User_Export' },
    role: String,
    text: String,
    timestamp: { type: Date, default: Date.now }
});
const Chat = mongoose.model('Chat_Export', chatSchema, 'chats');

const sendExportEmail = async () => {
    try {
        await connectDB();

        console.log('📡 Fetching Users...');
        const users = await User.find({}).lean();

        console.log('📡 Fetching Chat History...');
        const chats = await Chat.find({}).populate('userId', 'username').lean();

        // 1. Format User Table
        let userTable = `
            <h2>👤 User Database</h2>
            <table border="1" cellpadding="10" style="border-collapse: collapse; width: 100%; border: 1px solid #ddd;">
                <thead>
                    <tr style="background-color: #f2f2f2; text-align: left;">
                        <th>Username</th>
                        <th>Email</th>
                        <th>Hashed Password</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(u => `
                        <tr>
                            <td>${u.username}</td>
                            <td>${u.email}</td>
                            <td style="font-family: monospace; font-size: 12px; color: #666;">${u.password}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        // 2. Format Chat History
        let chatSection = `
            <h2>💬 Chat History</h2>
            <table border="1" cellpadding="10" style="border-collapse: collapse; width: 100%; border: 1px solid #ddd;">
                <thead>
                    <tr style="background-color: #f2f2f2; text-align: left;">
                        <th>User</th>
                        <th>Role</th>
                        <th>Message</th>
                        <th>Timestamp</th>
                    </tr>
                </thead>
                <tbody>
                    ${chats.sort((a, b) => b.timestamp - a.timestamp).map(c => `
                        <tr>
                            <td><strong>${c.userId ? c.userId.username : 'Unknown'}</strong></td>
                            <td>${c.role}</td>
                            <td>${c.text}</td>
                            <td>${new Date(c.timestamp).toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        const mailOptions = {
            from: `"Div.ai System" <${process.env.EMAIL_USER}>`,
            to: 'canvadwala@gmail.com',
            subject: '📦 Div.ai Data Export: Users & Chat History',
            html: `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h1>Div.ai Data Export</h1>
                    <p>Attached is the current list of users and the complete chat history as requested.</p>
                    <hr>
                    ${userTable}
                    <br><hr><br>
                    ${chatSection}
                </div>
            `
        };

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        console.log('🚀 Sending Email...');
        await transporter.sendMail(mailOptions);
        console.log('✅ Data export email sent successfully to canvadwala@gmail.com');

        await mongoose.connection.close();
        process.exit(0);

    } catch (error) {
        console.error('❌ Export Failed:', error);
        process.exit(1);
    }
};

sendExportEmail();
