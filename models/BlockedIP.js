const mongoose = require('mongoose');

const blockedIPSchema = new mongoose.Schema({
    ip: { type: String, required: true, unique: true },
    reason: { type: String, default: 'Vi phạm bảo mật' },
    createdAt: { type: Date, default: Date.now }
});
const BlockedIP = mongoose.model('BlockedIP', blockedIPSchema);
module.exports = BlockedIP;