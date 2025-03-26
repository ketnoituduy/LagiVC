const mongoose = require('mongoose');

const ipSchema = new mongoose.Schema({
    ip: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: '3d' }
});

const IPModel = mongoose.model('IP', ipSchema);

module.exports = IPModel;