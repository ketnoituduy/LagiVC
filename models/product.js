const mongoose = require('mongoose');
const productSchema = new mongoose.Schema({
    category:{
        categoryId:{
            type:String
        },
        categoryName:{
            type:String
        }
    },
    dayCreated:{
        type:String
    },
    dayUpdated:{
        type:String
    },
    description:{
        type:String
    },
    enabled:{
        type:Boolean
    },
    image:{
        imageUrl:{
            type:String
        }
    },
    name:{
        type:String
    },
    oldPrice:{
        type:String
    },
    price:{
        type:String
    },
    restaurant:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Restaurant'
    },
    khuvucId:String
})
const Product = mongoose.model('Product',productSchema);
module.exports = Product;