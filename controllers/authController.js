const User = require('../models/user');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const twilio = require('twilio');

require('dotenv').config();
const ipAddress = process.env.IP_ADDRESS;
const port = process.env.PORT || 4000;


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
        text: `Vui lòng nhấn link này để xác nhận Email của bạn : ${ipAddress}/verify/${verificationToken}`
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
    registerphone: async (req, res) => {
        const { phone } = req.body;
        // Tạo OTP ngẫu nhiên (6 chữ số)
        const otp = Math.random().toString().slice(-6);
        const user = await User.findOne({ phone: phone });
        if (!user) {
            const newUser = new User({ phone, otp });
            await newUser.save();
             // Gửi OTP qua Twilio
             const accountSid = process.env.TWILIO_ACCOUNT_SID;
             const authToken = process.env.TWILIO_AUTH_TOKEN;
             const twilioClient = twilio(accountSid, authToken);
             const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
            try {
                await twilioClient.messages.create({
                    body: `Your OTP code is: ${otp}`,
                    from: twilioPhoneNumber,
                    to: phone
                });
                console.log('hellooooo Twilio');
                res.status(200).json({ success: true, message: 'OTP sent successfully!' });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        }


    },
    verifyphone: async (req, res) => {
        const { phone, otp } = req.body;

        try {
            const user = await User.findOne({ phone });

            if (!user) {
                return res.status(400).json({ success: false, message: 'User not found' });
            }

            if (user.otp !== otp) {
                return res.status(400).json({ success: false, message: 'Invalid OTP' });
            }

            user.verified = true;
            await user.save();

            res.status(200).json({ success: true, message: 'User successfully verified!' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
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
        try {
            const { email, password, socketId } = req.body;
            const user = await User.findOne({ email: { $regex: new RegExp('^' + email, 'i') } });

            if (!user) {
                return res.status(400).json({ message: 'User chua duoc dang ky' });
            }
            if (user.password !== password) {
                return res.status(401).json({ message: 'Mat khau khong chinh xac' });
            }
            if (!user.verified) {
                return res.status(402).json({ message: 'Chua xac nhan Email dang ky' });
            }

            const token = createToken(user._id);
            const khuvucId = user.khuvuc.khuvucId;
            user.socketId = socketId;
            await user.save();

            res.status(200).json({ token, khuvucId });
        } catch (error) {
            res.status(500).json({ message: 'Internal Server Error' });
        }
    }
}



module.exports = authController;
