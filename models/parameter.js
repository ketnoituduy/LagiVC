const mongoose = require('mongoose');
const parameterSchema = new mongoose.Schema({

})
const Parameter = mongoose.model('Parameter',parameterSchema);
module.exports = Parameter;