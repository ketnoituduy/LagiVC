const User = require('../models/user');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const createToken = (userId) => {
    const payload = {
        userId: userId
    };
    // const secrectKey = crypto.randomBytes(20).toString('hex');
    const token = jwt.sign(payload, process.env.ACCESS_TOKEN);
    return token;
}
//goi email xac nhan
const sendVerificationEmail = async (email, verificationToken) => {
    const transpoter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD
        }
    })
    const mailOption = {
        from: 'Lagi VC',
        to: email,
        subject: 'Email verification',
        text: `Vui lòng nhấn link này để xác nhận Email của bạn : http://${ipAddress}:${port}/verify/${verificationToken}`
    };
    try {
        await transpoter.sendMail(mailOption);
        console.log('goi email xac nhan thanh cong');
    }
    catch (error) {
        console.log('loi goi xac nhan Email');
    }
}

//goi Email lay lai mat khau
const sendGetPasswordEmail = async (email, password) => {
    const transpoter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD
        }
    })
    const mailOption = {
        from: 'Lagi VC',
        to: email,
        subject: 'Lấy lại Password',
        text: `Mật khẩu của bạn: ${password}`
    };
    try {
        await transpoter.sendMail(mailOption);
        console.log('goi email xac nhan thanh cong');
    }
    catch (error) {
        console.log('loi goi xac nhan Email');
    }
}

const authController = {
    //dang ky tai khoan email
    register: async (req, res) => {
        try {
            const data = req.body;
            const user = await User.findOne({ email: data.email });
            if (user) {
                return res.status(500).json({ message: 'User da ton tai' });
            }
            const newUser = new User(data);
            newUser.verificationToken = crypto.randomBytes(20).toString("hex");
            await newUser.save();
            res.status(200).json({ message: 'thanh cong trong viec tao tai khoan' });
            sendVerificationEmail(newUser.email, newUser.verificationToken)
        }
        catch (error) {
            console.log('registion failed')
            res.status(500).json({ message: "registion failed" });
        }
    },
    //xac nhan email dang ky
    verifyedEmail: async (req, res) => {
        try {
            const token = req.params.token;
            const user = await User.findOne({ verificationToken: token });
            if (!user) {
                return res.status(500).json({ message: 'token khong duoc xac thuc' });
            }
            user.verified = true;
            user.verificationToken = undefined;

            await user.save();
            res.status(200).json({ message: 'Email da duoc xac nhan' });
        }
        catch (error) {
            console.log('error', error);
            res.status(500).json({ message: 'Loi xac nhan Email' });
        }
    },
    //Goi Email xac nhan 
    sendEmailVerification: async (req, res) => {
        const email = req.params.email;
        const user = await User.findOne({ email: email });
        if (!user) {
            return res.status(500).json({ message: 'khong co user ton tai' });
        }
        user.verificationToken = crypto.randomBytes(20).toString("hex");
        await user.save();
        res.status(200).json({ message: 'Goi email xac nhan thanh cong' });
        sendVerificationEmail(email, user.verificationToken);
    },
    //Lay lai Password bị quên
    sendPasswordEmail: async (req, res) => {
        const email = req.params.email;
        const user = await User.findOne({ email: email });
        if (!user) {
            return res.status(500).json({ message: 'khong co user ton tai' });
        }
        const password = user.password;
        res.status(200).json({ message: 'Goi email lay lai password thanh cong' });
        sendGetPasswordEmail(email, password);
    },

    // dang nhap tai khoan
    loginAccount: async (req, res) => {
        const { email, password, socketId } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User chua duoc dang ky' });
        }
        if (user.password != password) {
            return res.status(401).json({ message: 'Mat khau khong chinh xac' });
        }
        if (!user.verified) {
            return res.status(402).json({ message: 'Chua xac nhan Email dang ky' });
        }
        const token = createToken(user._id);
        const khuvucId = user.khuvuc.khuvucId;
        user.socketId = socketId;
        await user.save();
        // next();
        res.status(200).json({ token, khuvucId });
    }
}

module.exports = authController;
