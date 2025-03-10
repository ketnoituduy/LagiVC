

const authRouter = require('express').Router();
const authController = require('../controllers/authController');
const { registerLimiter, loginLimiter } = require('../middlewares/rateLimiter');
//dang ky tai khoan email
authRouter.post('/register',registerLimiter, authController.register);
//dang ky newRegister
authRouter.post('/registerNew',registerLimiter, authController.registerNew);
//xac nhan email dang ky
authRouter.get('/verify/:token', authController.verifyedEmail);
//Goi Email xac nhan 
authRouter.post('/verifiedEmail/:email', authController.sendEmailVerification);
//Lay lai Password bị quên
authRouter.post('/getPassword/:email', authController.sendPasswordEmail);
// dang nhap tai khoan
authRouter.post('/login',loginLimiter,authController.loginAccount);
// dang ky bang so dien thoai
authRouter.post('/registerphone',authController.registerphone);
//xac nhan OTP
authRouter.post('/verifyphone',authController.verifyphone);
//goi link resetPassword
authRouter.post('/reset-password',authController.resetPasswordFromEmail);
//thay doi mat khau
authRouter.post('/change-password',authController.changePassword);

module.exports = authRouter;