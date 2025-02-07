const mongoose = require('mongoose');
const reviewSchema = new mongoose.Schema({
    clientName:{
        type:String
    },
    comment:{
        type:String
    },
    id:{
        type:String
    },
    rating:{
        type:Number
    },
    timeStamp: {
        type:Date
    },
    restaurant:{
        type:mongoose.Schema.Types.ObjectId,
        index:true,
        ref:'Restaurant'
    },
})
const Review = mongoose.model('Review',reviewSchema);
module.exports = Review;