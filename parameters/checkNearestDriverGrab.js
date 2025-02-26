const Deliver = require('../models/deliver');
const haversine = require('haversine');
const sendPushNotification = require("./sendPushNotification");
const OrderGrab = require("../models/orderGrab");


const checkNearestDriverGrab = async (clientLocation, orderGrabId, NearestDrivers, name, timeRequest, vehicleId, feeDeliver, khuvucId, socketIO) => {
    const delivers = await Deliver.find({ 'isActive': true,status:1, 'vehicleId': vehicleId, 'khuvuc.khuvucId': khuvucId, 'tiencuoc': { $gte: feeDeliver } });
    const order = await OrderGrab.findById(orderGrabId);
    if(!order){
        return;
    }
    let nearestDriver = null;
    let minDistanceObj = { minDistance: Infinity, rating: 0 }; // Object chứa thông tin minDistance và rating
    if (NearestDrivers.length >= delivers.length) {
        NearestDrivers = [];
        const { status, khuvuc, vehicleId, clientId } = order;
        const khuvucId = khuvuc.khuvucId;
        if (status.name === 'Chờ tài xế') {
            order.fullScanDriver = true;
            order.deliveryId = '';
            socketIO.emit('Server_ClientSendOrderGrabToDelivers', { khuvucId, vehicleId, clientId });
            await order.save();
            return;
        }
        return;
    }
    delivers.forEach(doc => {
        const existingDriver = NearestDrivers.find(deliver => deliver.deliverId === doc._doc.deliverId);
        if (!existingDriver) {
            const point1 = { latitude: clientLocation.latitude, longitude: clientLocation.longitude };
            const point2 = { latitude: doc._doc.latitude, longitude: doc._doc.longitude };
            const distance = haversine(point1, point2);
            if (distance < 1500 && doc._doc.rating > minDistanceObj.rating) { // Kiểm tra đánh giá và khoảng cách
                minDistanceObj.minDistance = distance;
                minDistanceObj.rating = doc._doc.rating;
                nearestDriver = { ...doc._doc };
            } else if (distance < minDistanceObj.minDistance) {
                minDistanceObj.minDistance = distance;
                minDistanceObj.rating = doc._doc.rating;
                nearestDriver = { ...doc._doc };
            }
        }
    })
    NearestDrivers.push(nearestDriver);
    if (nearestDriver) {
        // const order = await Order.findById(orderId);
        const { status, khuvuc, vehicleId, clientId } = order;
        const khuvucId = khuvuc.khuvucId;
        if (status.name === "Chờ tài xế") {
            order.deliveryId = nearestDriver.deliverId;
            order.deliveryNotificationToken = nearestDriver.deliveryNotificationToken;
            order.fullScanDriver = false;
            await order.save();
            socketIO.emit('Server_ClientSendOrderGrabToDelivers', { khuvucId, vehicleId, clientId });
            sendPushNotification(nearestDriver.deliveryNotificationToken, 'Thông báo', 'Có cuộc gọi xe từ khách hàng')
                .then(response => {
                    console.log('kq gui thong bao', response);
                })
                .catch(error => {
                    console.error('loi gui thong bao', error);
                })
        }
    }
    else {
        NearestDrivers = [];
        return;
    }
    const timeout = timeRequest;
    try {
        setTimeout(async () => {
            // const order = await Order.findById(orderId);
            const { deliveryId, status } = order;
            if (status.name === "Chờ tài xế" && deliveryId === nearestDriver.deliverId) {
                await checkNearestDriverGrab(clientLocation, orderGrabId, NearestDrivers, name, timeRequest, vehicleId, feeDeliver, khuvucId, socketIO);
            }
        }, timeout);
    }
    catch (err) {
        console.log('Lỗi xử lý thời gian chờ', err);
    }

}

module.exports = checkNearestDriverGrab;