const mongoose = require('mongoose');
const versionSchema = new mongoose.Schema({
   
})
const Version = mongoose.model('Version',versionSchema);
module.exports = Version;