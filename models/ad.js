const mongoose = require('mongoose');
const adSchema = new mongoose.Schema({
    activePeriodEnd:Date,
    activePeriodStart:Date,
    dayCreated:Date,
    imageUrl:String,
    isActive:Boolean,
    khuvuc:Object,
    name:String,
    restaurantId:String
})
const Ad = mongoose.model('Ad',adSchema);
module.exports = Ad;