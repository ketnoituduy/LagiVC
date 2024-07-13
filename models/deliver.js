const mongoose = require('mongoose');
const deliverSchema = new mongoose.Schema({
    name:String,
    phone:String,
    khuvuc:Object,
    dayCreated:Date,
    deliveryNotificationToken:String,
    email:String,
    imageUrl:String,
    isActive:Boolean,
    latitude:Number,
    longitude:Number,
    licensePlates:String,
    tiencuoc:Number,
    vehicleId:String,
    deliverId:String,
    socketId:String
})
const Deliver = mongoose.model('Deliver',deliverSchema);
module.exports = Deliver;