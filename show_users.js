require('dotenv').config();
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: { type: String, select: true }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function showLastUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB...");

        const users = await User.find()
            .sort({ _id: -1 })
            .limit(5);

        console.log("\n--- LAST 5 REGISTERED USERS ---");
        users.forEach((u, i) => {
            console.log(`${i + 1}. Username: ${u.username}`);
            console.log(`   Email:    ${u.email}`);
            console.log(`   Hash:     ${u.password}`);
            console.log('---------------------------');
        });

        await mongoose.connection.close();
    } catch (err) {
        console.error("Error:", err.message);
    }
}

showLastUsers();
