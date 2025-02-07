const mongoose = require('mongoose');
const reviewDeliverSchema = new mongoose.Schema({
    clientName:{
        type:String
    },
    comment:{
        type:String
    },
    rating:{
        type:Number
    },
    timeStamp: {
        type:Date
    },
    deliver:{
        type:mongoose.Schema.Types.ObjectId,
        index:true,
        ref:'Deliver'
    },
    id:{
        type:String
    }
})
const ReviewDeliver = mongoose.model('ReviewDeliver',reviewDeliverSchema);
module.exports = ReviewDeliver;