const deliverRouter = require('express').Router();
const deliverController = require('../controllers/deliverController');
//dang ky tai xe
deliverRouter.post('/dangkytaixe/:userId',deliverController.createDeliver);
//lay thong tin tai xe
deliverRouter.get('/getDeliver/:userId',deliverController.getInfoDeliver);
//cap nhat thong tin tai xe
deliverRouter.post('/updatedDeliver/:userId',deliverController.updateDeliver);
//cap nhat vi tri tai xe
deliverRouter.post('/updatedLocationDeliver/:userId',deliverController.updateLocationDeliver);
//lay vi tri cac tai xe
deliverRouter.get('/delivers/location/:khuvucId/:vehicleId',deliverController.getLocationDelivers);
//Danh gia tai xe
deliverRouter.post('/reviewDeliver/:deliverId/:orderGrabId',deliverController.reviewDeliver);
//lay du lieu doanh thu deliver
deliverRouter.get('/getRevenueDeliver/:id/:mode/:date/:year/:month',deliverController.getRevenueDeliver);

module.exports = deliverRouter;
