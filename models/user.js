const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email:{type: String, require:true, unique:true, index: true},
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
    socketId:String,
    admin:{
        type:Boolean,
        default:false
    },
    phone: {
        type: String,
    },
    otp: {
        type: String,
    }
})

const User = mongoose.model('User',userSchema);
module.exports = User;