const authRouter = require('express').Router();
const authController = require('../controllers/authController');
//dang ky tai khoan email
authRouter.post('/register', authController.register);
//xac nhan email dang ky
authRouter.get('/verify/:token', authController.verifyedEmail);
//Goi Email xac nhan 
authRouter.post('/verifiedEmail/:email', authController.sendEmailVerification);
//Lay lai Password bị quên
authRouter.post('/getPassword/:email', authController.sendPasswordEmail);
// dang nhap tai khoan
authRouter.post('/login',authController.loginAccount);

module.exports = authRouter;