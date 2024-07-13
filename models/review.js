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
    }
})
const Review = mongoose.model('Review',reviewSchema);
module.exports = Review;