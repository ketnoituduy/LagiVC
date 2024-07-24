const orderRouter = require('express').Router();
const orderController = require('../controllers/orderController');
//tao order moi khi mua hang
orderRouter.post('/:userId/order',orderController.createNewOrder);
//tao orderGrab 
orderRouter.post('/ClientSendOrderGrabToDelivers/:userId',orderController.createOrderGrab);
//khach hang nhan orders
orderRouter.get('/client/getOrders/:userId',orderController.clientGetOrders);
//khach hang nhan ordersGrab
orderRouter.get('/client/getOrdersGrab/:userId',orderController.clientGetOrdersGrab);
//cua hang nhan orders
orderRouter.get('/restaurant/getOrders/:userId',orderController.restaurantGetOrders);
//cua hang cancel order
orderRouter.post('/restaurant/cancelOrder/:orderId',orderController.restaurantCancelOrder);
//nhan orders tu tai xe
orderRouter.get('/deliver/getOrders/:khuvucId/:userId/:vehicleId',orderController.deliverGetOrders);
//nhan orders grab tu tai xe
orderRouter.get('/deliver/getOrdersGrab/:khuvucId/:userId/:vehicleId',orderController.deliverGetOrdersGrab);
//xoa order tu Client
orderRouter.delete('/deleteOrder/:orderId',orderController.clientDeleteOrder);
//xoa orderGrab tu Client
orderRouter.delete('/deleteOrderGrab/:orderGrabId',orderController.clientDeleteOrderGrab);
//tai xe chap nhan don hang tu cua hang
orderRouter.post('/deliverAcceptOrder/:userId/:orderId',orderController.deliverAcceptOrderFromRestaurant);
//tai xe chap nhan cho khach
orderRouter.post('/deliverAcceptOrderGrab/:userId/:orderGrabId',orderController.deliverAcceptOrderGrab);
//tai xe da giao hang
orderRouter.post('/DeliveredOrder/:userId/:orderId',orderController.DeliveredOrder);

module.exports = orderRouter;