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
    deliverId:{type:String,unique:true,index:true},
    socketId:String,
    reviews:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:'ReviewDeliver'
        }
    ],
    rating:Number,
    numRatings:Number,
    urlImageCMNDMatTruoc:String,
    urlImageCMNDMatSau:String,
    numOrder:{type:Number,default:0},
    numOrderGrab:{type:Number,default:0},
    status:{type:Number,default:1}
})
const Deliver = mongoose.model('Deliver',deliverSchema);
module.exports = Deliver;