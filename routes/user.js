const userController = require('../controllers/userController');
const userRouter = require('express').Router();

//reset password
userRouter.post('/resetPassword/:userId',userController.resetPassword);
//lay region user
userRouter.get('/regionUser/:userId',userController.regionUser);
//xoa user
userRouter.post('/deleteAccount/:userId',userController.deleteAccount);
//lay thong tin User
userRouter.get('/users/:userId',userController.getUser);
//cap nhat thong tin User
userRouter.post('/users/:userId',userController.updateUser);
//cap nhat khu vuc cho User
userRouter.post('/capnhatKhuvuc/:userId',userController.updateLocationUser);
//lay danh sach dia chi User
userRouter.get('/listAddress/:userId',userController.getListAddressUser);
//them dia chi vao danh sach dia chi User
userRouter.post('/addAddress/:userId',userController.addUserAddress);
//luu vi tri user
userRouter.post('/saveAddress/:userId',userController.saveUserAddress);
//xoa dia chi cua uer trong danh sach dia chi
userRouter.put('/deleteAddress/:userId/:index',userController.deleteUserAddress);

module.exports = userRouter;