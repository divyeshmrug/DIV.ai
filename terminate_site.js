require('dotenv').config();
const mongoose = require('mongoose');

const systemStatusSchema = new mongoose.Schema({
    isMaintenance: { type: Boolean, default: false },
    updatedAt: { type: Date, default: Date.now }
});
const SystemStatus = mongoose.model('SystemStatus', systemStatusSchema);

async function terminate() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const system = await SystemStatus.findOne();
        if (system) {
            system.isMaintenance = true;
            system.updatedAt = new Date();
            await system.save();
        } else {
            await new SystemStatus({ isMaintenance: true }).save();
        }
        console.log('✅ Site TERMINATED. Message: LOL');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error terminating site:', err.message);
        process.exit(1);
    }
}

terminate();
