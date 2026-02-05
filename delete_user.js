require('dotenv').config();
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: String,
    email: String
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function deleteUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB...");

        const result = await User.deleteOne({ username: 'God' });

        if (result.deletedCount === 1) {
            console.log("✅ User 'God' successfully removed.");
        } else {
            console.log("⚠️ User 'God' not found.");
        }

        await mongoose.connection.close();
    } catch (err) {
        console.error("Error:", err.message);
    }
}

deleteUser();
