const mongoose = require('mongoose');
const versionSchema = new mongoose.Schema({
    latestVersion: String,
    mandatoryUpdate: Boolean,
})
const Version = mongoose.model('Version',versionSchema);
module.exports = Version;