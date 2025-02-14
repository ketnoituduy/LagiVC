const User = require('../models/user');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
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

            // Kiểm tra xem email đã tồn tại chưa
            const user = await User.findOne({ email: data.email });
            if (user) {
                return res.status(400).json({ message: "User đã tồn tại" });
            }

            // Mã hóa mật khẩu
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(data.password, salt);

            // Tạo người dùng mới
            const newUser = new User({
                ...data,
                password: hashedPassword, // Lưu mật khẩu đã hash
                verificationToken: crypto.randomBytes(20).toString("hex"),
            });

            // Lưu vào database
            await newUser.save();

            // Gửi email xác minh
            sendVerificationEmail(newUser.email, newUser.verificationToken);

            res.status(201).json({ message: "Đăng ký thành công, vui lòng kiểm tra email để xác nhận tài khoản." });
        } catch (error) {
            console.error("Đăng ký thất bại:", error);
            res.status(500).json({ message: "Đăng ký thất bại" });
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
    // Gửi email thay đổi mật khẩu
    resetPasswordFromEmail: async (req, res) => {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: 'Email không tồn tại' });
        }

        // Tạo token reset mật khẩu
        const token = jwt.sign({ userId: user._id }, process.env.ACCESS_TOKEN, { expiresIn: '1h' });

        // Tạo link thay đổi mật khẩu
        const resetLink = `lagivc://reset-password/${token}`;

        // Cấu hình gửi email
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        const mailOptions = {
            from: 'Lagi VC',
            to: email,
            subject: 'Thay đổi mật khẩu',
            text: `Bạn đã yêu cầu thay đổi mật khẩu. Vui lòng nhấn vào link sau để thay đổi mật khẩu: ${resetLink}`
        };

        try {
            await transporter.sendMail(mailOptions);
            res.status(200).json({ message: 'Link thay đổi mật khẩu đã được gửi đến email của bạn' });
        } catch (err) {
            res.status(500).json({ message: 'Lỗi gửi email' });
        }
    },
    // API thay đổi mật khẩu
    changePassword: async (req, res) => {
        const { token, newPassword } = req.body;

        try {
            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN);
            const user = await User.findById(decoded.userId);

            if (!user) {
                return res.status(400).json({ message: 'Người dùng không tồn tại' });
            }

            // Cập nhật mật khẩu mới cho người dùng
            user.password = newPassword;
            await user.save();

            res.status(200).json({ message: 'Mật khẩu đã được thay đổi thành công' });
        } catch (err) {
            res.status(400).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
        }
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

            // Tìm user theo email (không phân biệt chữ hoa/thường)
            const user = await User.findOne({ email })
                .collation({ locale: "en", strength: 2 });

            if (!user) {
                return res.status(400).json({ message: "User chưa được đăng ký" });
            }

            // So sánh mật khẩu nhập vào với mật khẩu đã hash trong database
            const isMatch = bcrypt.compareSync(password,user.password);
            if (!isMatch) {
                return res.status(401).json({ message: "Invalid credentials" });
            }

            if (!user.verified) {
                return res.status(402).json({ message: "Chưa xác nhận Email đăng ký" });
            }

            // Tạo token đăng nhập
            const token = createToken(user._id);
            const khuvucId = user.khuvuc.khuvucId;

            // Cập nhật socketId của user
            user.socketId = socketId;
            await user.save();

            res.status(200).json({ token, khuvucId });
        } catch (error) {
            console.error("Login failed:", error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }
}



module.exports = authController;
