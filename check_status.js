require('dotenv').config();
const mongoose = require('mongoose');

const systemStatusSchema = new mongoose.Schema({
    isMaintenance: { type: Boolean, default: false },
    updatedAt: { type: Date, default: Date.now }
});
const SystemStatus = mongoose.model('SystemStatus', systemStatusSchema);

async function checkStatus() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const system = await SystemStatus.findOne();
        console.log('--- DATABASE STATUS ---');
        console.log('isMaintenance:', system ? system.isMaintenance : 'NOT FOUND');
        console.log('-----------------------');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error checking status:', err.message);
        process.exit(1);
    }
}

checkStatus();
