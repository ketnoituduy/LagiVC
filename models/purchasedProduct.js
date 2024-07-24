const mongoose = require('mongoose');
const purchasedProductSchema = new mongoose.Schema({
    category:{
        categoryId:{
            type:String
        },
        categoryName:{
            type:String
        }
    },
    imageUrl:String,
    khuvuc:{type:Object},
    name:String,
    price:String,
    quantity:Number,
    quantityInDay:Number,
    restaurantId:String,
    restaurantName:String,
    timestamp:Date,
    productId:String
})
const PurchasedProduct = mongoose.model('PurchasedProduct',purchasedProductSchema);
module.exports = PurchasedProduct;
