const mongoose = require('mongoose');
const orderGrabSchema = new mongoose.Schema({
    clientAddress:String,
    clientId:String,
    clientLocation:Object,
    clientName:String,
    clientNote:String,
    clientNotificationToken:String,
    clientPhone:String,
    clientPhotoUrl:String,
    deliveryId:String,
    deliveryName:String,
    deliveryNotificationToken:String,
    deliveryPhone:String,
    deliveryPhotoUrl:String,
    destinationAddress:String,
    destinationLocation:Object,
    distance:String,
    fullScanDriver:Boolean,
    khuvuc:Object,
    points:[Object],
    status:Object,
    timestamp:String,
    totalAmount:Number,
    transportFee:Number,
    vehicleId:String
})
const OrderGrab = mongoose.model('OrderGrab',orderGrabSchema);
module.exports = OrderGrab;