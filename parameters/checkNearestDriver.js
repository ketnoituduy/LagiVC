const Order = require("../models/order");
const Deliver = require('../models/deliver');
const haversine = require('haversine');
const sendPushNotification = require("./sendPushNotification");


const checkNearestDriver = async (restaurantLocation, orderId, NearestDrivers, name, timeRequest, vehicleId, feeDeliver, khuvucId, socketIO) => {
    const delivers = await Deliver.find({ 'isActive': true, 'vehicleId': vehicleId, 'khuvuc.khuvucId': khuvucId, 'tiencuoc': { $gte: feeDeliver } });
    const order = await Order.findById(orderId);
    let nearestDriver = null;
    let minDistance = Infinity;
    if (NearestDrivers.length >= delivers.length) {
        NearestDrivers = [];
        // const order = await Order.findById(orderId);
        const { status, khuvuc, restaurantId, vehicleId, clientId } = order;
        const khuvucId = khuvuc.khuvucId;
        if (status.name === 'Chấp nhận') {
            order.fullScanDriver = true;
            order.deliveryId = '';
            socketIO.emit('Server_RestaurantSendOrderToDelivers',{khuvucId,restaurantId,vehicleId, clientId});
            await order.save();
            return;
        }
        return;
    }
    delivers.forEach(doc => {
        const existingDriver = NearestDrivers.find(deliver => deliver.deliverId === doc._doc.deliverId);
        if (!existingDriver) {
            const point1 = { latitude: restaurantLocation.latitude, longitude: restaurantLocation.longitude };
            const point2 = { latitude: doc._doc.latitude, longitude: doc._doc.longitude };
            const distance = haversine(point1, point2);
            if (distance < minDistance) {
                minDistance = distance;
                nearestDriver = { ...doc._doc };
            }
        }
    })
    NearestDrivers.push(nearestDriver);
    if (nearestDriver) {
        // const order = await Order.findById(orderId);
        const { status, restaurantId, khuvuc, vehicleId, clientId } = order;
        const khuvucId = khuvuc.khuvucId;
        if (status.name === "Chấp nhận") {
            order.deliveryId = nearestDriver.deliverId;
            order.deliveryNotificationToken = nearestDriver.deliveryNotificationToken;
            order.fullScanDriver = false;
            await order.save();
            socketIO.emit('Server_RestaurantSendOrderToDelivers',{khuvucId,restaurantId,vehicleId, clientId});
            sendPushNotification(nearestDriver.deliveryNotificationToken, 'Thông báo', 'Có đơn hàng từ cửa hàng')
                .then(response => {
                    console.log('kq gui thong bao', response);
                })
                .catch(error => {
                    console.error('loi gui thong bao', error);
                })
            console.log('dang goi tin hieu');
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
            if (status.name === "Chấp nhận" && deliveryId === nearestDriver.deliverId) {
                await checkNearestDriver(restaurantLocation, orderId, NearestDrivers, name, timeRequest, vehicleId, feeDeliver, khuvucId, socketIO);
            }
        }, timeout);
    }
    catch (err) {
        console.log('Lỗi xử lý thời gian chờ', err);
    }

}

module.exports = checkNearestDriver;