const mongoose = require('mongoose');
const orderSchema = new mongoose.Schema({
    client:String,
    clientAddress:String,
    clientId:String,
    clientLocation:{type:Object},
    clientNote:String,
    clientNotificationToken:String,
    clientPhone:String,
    clientPhotoUrl:String,
    deliveryId:String,
    deliveryName:String,
    deliveryNotificationToken:String,
    deliveryPhone:String,
    deliveryPhotoUrl:String,
    distance:String,
    fee:Number,
    fullScanDriver:Boolean,
    items:[Object],
    khuvuc:Object,
    points:[Object],
    restaurantAddress:String,
    restaurantId:String,
    restaurantImage:String,
    restaurantLocation:Object,
    restaurantName:String,
    restaurantNote:String,
    restaurantNotificationToken:String,
    restaurantPhone:String,
    status:Object,
    timestamp: String,
    createdAt:Date,
    totalAmount:Number,
    transportFee:Number,
    vehicleId:String,
    supportShip: Number,
    numberOrder:Number
})
const Order = mongoose.model('Order',orderSchema);
module.exports = Order;