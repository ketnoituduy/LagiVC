const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email:{type: String, require:true, unique:true},
    name:{type:String, require:true},
    password:{type:String,require:true},
    phoneNumber:{type:String,require:true},
    phoneIntroducer:{type:String},
    urlAvatar:String,
    verified:{
        type:Boolean,
        default:false
    },
    verificationToken:String,
    dayCreated:{type:String},
    dayUpdated:{type:String},
    khuvuc:{    
        khuvucId:{type:String},
        nameKhuvuc:{type:String},
        toadoKhuvuc: { type: [Number], required: true } // Mảng chứa 2 số
    },
    listLocation:{type:Array},
    location:Object,
    // location:{
    //     address:{type:String},
    //     coordinates:[Number],
    //     id:{type:Number},
    //     index:{type:Number},
    //     latitude:{type:Number},
    //     longitude:{type:Number},
    //     streetAddress:{type:String}
    // },
    socketId:String,
    admin:{
        type:Boolean,
        default:false
    }
})

const User = mongoose.model('User',userSchema);
module.exports = User;