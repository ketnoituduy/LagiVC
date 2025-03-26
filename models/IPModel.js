const mongoose = require('mongoose');

const ipSchema = new mongoose.Schema({
    ip: { type: String, required: true, unique: true },
    requestCount: { type: Number, default: 1 },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), index: { expires: '3d' } } // Tự xóa sau 3 ngày
});

const IPModel = mongoose.model('IP', ipSchema);

module.exports = IPModel;