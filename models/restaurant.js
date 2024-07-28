const mongoose = require('mongoose');
const restaurantSchema = new mongoose.Schema({
    name: { type: String, require: true },
    address: { type: String, require: true },
    phone: { type: String, require: true },
    active: { type: Boolean, default: false },
    isActive: { type: Boolean, default: false },
    image: { imageUrl: { type: String, require: true } },
    location: {
        address: { type: String },
        latitude: { type: Number },
        longitude: { type: Number }
    },
    khuvuc:{
        khuvucId:{type:String},
        nameKhuvuc:{type:String},
        toadoKhuvuc:{type:Array}
    },
    notificationToken: { type: String },
    numberOrder: { type: Number, default: 0 },
    dateClose1:{type:String},
    dateClose2:{type:String},
    dateOpen1:{type:String},
    dateOpen2:{type:String},
    dayCreated:{type:Date},
    dayUpdated:{type:String},
    restaurantId: {type:String},
    socketId:String,
    products:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:'Product'
        }
    ],
    reviews:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:'Review'
        }
    ],
    numRatings:Number,
    rating:Number,
    stars:{ type: [Number] } ,
    supportShips:{type:Array}
})
const Restaurant = mongoose.model('Restaurant', restaurantSchema);
module.exports = Restaurant;