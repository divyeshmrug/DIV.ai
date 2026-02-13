require('dotenv').config();
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: String,
    email: String
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function findSoham() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB...");

        const users = await User.find({
            $or: [
                { username: { $regex: 'soham', $options: 'i' } },
                { email: { $regex: 'soham', $options: 'i' } }
            ]
        });

        if (users.length > 0) {
            console.log("\n--- FOUND USERS ---");
            users.forEach((u, i) => {
                console.log(`${i + 1}. Username: ${u.username}`);
                console.log(`   Email:    ${u.email}`);
                console.log('---------------------------');
            });
        } else {
            console.log("\nNo user found with 'soham' in username or email.");
        }

        await mongoose.connection.close();
    } catch (err) {
        console.error("Error:", err.message);
    }
}

findSoham();
