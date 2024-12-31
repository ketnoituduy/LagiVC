const User = require('../models/user');
const Restaurant = require('../models/restaurant');
const Deliver = require('../models/deliver');
const Order = require('../models/order');
const OrderGrab = require('../models/orderGrab');
const PurchasedProduct = require('../models/purchasedProduct');
const Parameter = require('../models/parameter');
const sendPushNotification = require('../parameters/sendPushNotification');
const orderController = {
    //tao order moi khi mua hang
    createNewOrder: async (req, res) => {
        const userId = req.params.userId;
        const user = await User.findOne({ _id: userId });
        if (!user) {
            return res.status(500).json({ message: 'Khong tim thay user' })
        }
        const data = req.body;
        const newOrder = new Order(data);
        await newOrder.save()
        res.status(200).json({ message: 'tao hoa don moi thanh cong' });
    },
    //tao orderGrab 
    createOrderGrab: async (req, res) => {
        const userId = req.params.userId;
        const user = await User.findOne({ _id: userId });
        if (!user) {
            return res.status(500).json({ message: 'Khong tim thay user' })
        }
        const data = req.body;
        const newOrderGrab = new OrderGrab(data);
        await newOrderGrab.save()
        const newData = {
            orderGrabId: newOrderGrab._id,
            clientLocation: newOrderGrab.clientLocation,
            khuvuc: newOrderGrab.khuvuc,
            vehicleId: newOrderGrab.vehicleId
        }
        res.status(200).json(newData);
    },
    //khach hang nhan orders
    clientGetOrders: async (req, res) => {
        const userId = req.params.userId;
        const pageNumber = parseInt(req.query.page) || 1;
        const perPage = 10;
        const skip = (pageNumber - 1) * perPage;
        const orders = await Order.find({ clientId: userId }).sort({ _id: -1 }).skip(skip).limit(perPage);
        if (orders.length === 0) {
            return res.status(204).json({ message: 'khong co hoa don' });
        }
        res.status(200).json(orders);
    },
    //khach hang nhan ordersGrab
    clientGetOrdersGrab: async (req, res) => {
        const userId = req.params.userId;
        const pageNumber = parseInt(req.query.page) || 1;
        const perPage = 10;
        const skip = (pageNumber - 1) * perPage;
        const orders = await OrderGrab.find({ clientId: userId }).sort({ _id: -1 }).skip(skip).limit(perPage);
        if (orders.length === 0) {
            return res.status(204).json({ message: 'khong co hoa don' });
        }
        res.status(200).json(orders);
    },
    //cua hang nhan orders
    restaurantGetOrders: async (req, res) => {
        const restaurantId = req.params.userId;
        const pageNumber = req.query.page;
        const perPage = 10;
        const skip = (pageNumber - 1) * perPage;
        const orders = await Order.find({ restaurantId: restaurantId }).sort({ _id: -1 }).skip(skip).limit(perPage);
        if (orders.length === 0) {
            return res.status(204).json({ message: 'khong co hoa don' });
        }
        res.status(200).json(orders);
    },
    //cua hang cancel order
    restaurantCancelOrder: async (req, res) => {
        const orderId = req.params.orderId;
        const data = req.body;
        const order = await Order.findById(orderId);
        order.status = data.status;
        order.restaurantNote = data.restaurantNote;
        await order.save();
        res.status(200).json({ message: 'Cancel hoa don thanh cong' });
    },
    //nhan orders tu tai xe
    deliverGetOrders: async (req, res) => {
        const deliverId = req.params.userId;
        const vehicleId = req.params.vehicleId;
        const khuvucId = req.params.khuvucId;
        const pageNumber = req.query.page;
        const perPage = 10;
        const skip = (pageNumber - 1) * perPage;
        const orders = await Order.find({
            $or: [
                { deliveryId: deliverId },
                { fullScanDriver: true }
            ]
        }).sort({ _id: -1 }).skip(skip).limit(perPage);
        if (orders.length === 0) {
            return res.status(204).json({ message: 'khong co hoa don' });
        }
        const ordersFilter = orders.filter(order => (order.khuvuc.khuvucId === khuvucId
            && ((order.deliveryId === deliverId &&
                order.vehicleId === vehicleId) || (order.vehicleId === vehicleId &&
                    order.status.name === 'Chấp nhận' && order.fullScanDriver === true))));
        console.log('helooo order Deliver', ordersFilter.length);
        res.status(200).json(ordersFilter);
    },
    //nhan orders grab tu tai xe
    deliverGetOrdersGrab: async (req, res) => {
        const deliverId = req.params.userId;
        const vehicleId = req.params.vehicleId;
        const khuvucId = req.params.khuvucId;
        const pageNumber = req.query.page;
        const perPage = 10;
        const skip = (pageNumber - 1) * perPage;
        const orders = await OrderGrab.find({
            $or: [
                { deliveryId: deliverId },
                { fullScanDriver: true }
            ]
        }).sort({ _id: -1 }).skip(skip).limit(perPage);
        if (orders.length === 0) {
            return res.status(204).json({ message: 'khong co hoa don' });
        }
        const ordersFilter = orders.filter(order => (order.khuvuc.khuvucId === khuvucId
            && ((order.deliveryId === deliverId &&
                order.vehicleId === vehicleId) || (order.vehicleId === vehicleId &&
                    order.status.name === 'Chờ tài xế' && order.fullScanDriver === true))));
        res.status(200).json(ordersFilter);
    },
    //xoa order tu Client
    clientDeleteOrder: async (req, res) => {
        try {
            // Lấy orderId từ request params
            const orderId = req.params.orderId;

            // Kiểm tra xem đơn hàng có tồn tại không
            const order = await Order.findById(orderId);
            if (!order) {
                return res.status(404).json({ message: 'Đơn hàng không tồn tại' });
            }
            if (order.status.name === 'Đang xử lý') {
                await Order.findByIdAndDelete(orderId);
                res.status(200).json({ message: 'Đơn hàng đã được xóa' });
            }
            else {
                res.status(402).json({ message: 'Đơn hàng này đã được chấp nhận, bạn không thể xoá' });
            }
        }
        catch (err) {
            console.log(err);
            res.status(500).json({ message: 'Đã xảy ra lỗi khi xóa đơn hàng' });
        }
    },
    //xoa orderGrab tu Client
    clientDeleteOrderGrab: async (req, res) => {
        // Lấy orderId từ request params
        const orderId = req.params.orderGrabId;
        try {
            // Kiểm tra xem đơn hàng có tồn tại không
            const order = await OrderGrab.findById(orderId);
            if (!order) {
                return res.status(404).json({ message: 'Đơn hàng không tồn tại' });
            }
            if (order.status.name === 'Chờ tài xế') {
                await OrderGrab.findByIdAndDelete(orderId);
                res.status(200).json({ message: 'Đơn hàng đã được xóa' });
            }
            else {
                res.status(402).json({ message: 'Đơn hàng này đã được chấp nhận, bạn không thể xoá' });
            }
        }
        catch (err) {
            console.log(err);
            res.status(500).json({ message: 'Đã xảy ra lỗi khi xóa đơn hàng' });
        }
    },
    //tai xe chap nhan don hang tu cua hang
    deliverAcceptOrderFromRestaurant: async (req, res) => {
        const userId = req.params.userId;
        const orderId = req.params.orderId;
        const deliver = await Deliver.findOne({ deliverId: userId });
        const order = await Order.findById(orderId);
        const parameters = await Parameter.find();
        const tempParameters = parameters[0]._doc;
        if (!deliver || !order) {
            return res.status(404).json({ message: 'khong ton tai tai xe hoac hoa don' })
        }
        const { tiencuoc } = deliver;
        const { feeDeliver, statusColors } = tempParameters;
        const { deliveryId, fullScanDriver, status } = order;
        if (deliveryId === '' || deliveryId === userId || ((fullScanDriver && status.name === 'Chấp nhận' && deliveryId === ''))) {
            if (tiencuoc < feeDeliver && status.name === 'Chấp nhận') {
                return res.status(201).json({ message: 'Tien cuoc khong du' });
            }
            else if (status.name === 'Chấp nhận') {
                const money = tiencuoc - feeDeliver;
                deliver.tiencuoc = money;
                await deliver.save();
            }
            const tempStatus = { name: 'Đang giao', color: statusColors.dangGiao };
            const deliveryName = deliver.name;
            const deliveryId = deliver.deliverId;
            const deliveryPhone = deliver.phone;
            const deliveryPhotoUrl = deliver.imageUrl;
            const fullScanDriver = false;
            order.status = tempStatus;
            order.deliveryName = deliveryName;
            order.deliveryId = deliveryId;
            order.deliveryPhone = deliveryPhone;
            order.deliveryPhotoUrl = deliveryPhotoUrl;
            order.fullScanDriver = fullScanDriver;
            await order.save();
            res.status(200).json({ message: 'da cap nhat order thanh cong' });
        }
        else {
            res.status(202).json({ message: 'don hang co tai xe khac giao' })
        }
    },
    //tai xe chap nhan cho khach
    deliverAcceptOrderGrab: async (req, res) => {
        const userId = req.params.userId;
        const orderId = req.params.orderGrabId;
        const data = req.body;
        const deliver = await Deliver.findOne({ deliverId: userId });
        const order = await OrderGrab.findById(orderId);
        const parameters = await Parameter.find();
        const tempParameters = parameters[0]._doc;
        if (!deliver || !order) {
            return res.status(404).json({ message: 'khong ton tai tai xe hoac hoa don' })
        }
        const { tiencuoc } = deliver;
        const { feeDeliver } = tempParameters;
        const { deliveryId, fullScanDriver, status } = order;
        if (deliveryId === '' || deliveryId === userId || ((fullScanDriver && status.name === 'Chờ tài xế' && deliveryId === ''))) {
            if (tiencuoc < feeDeliver && status.name === 'Chờ tài xế') {
                return res.status(201).json({ message: 'Tien cuoc khong du' });
            }
            else if (status.name === 'Chờ tài xế') {
                const money = tiencuoc - feeDeliver;
                deliver.tiencuoc = money;
                await deliver.save();
            }
            const tempStatus = { name: data.title, color: data.color };
            const deliveryName = deliver.name;
            const deliveryId = deliver.deliverId;
            const deliveryPhone = deliver.phone;
            const deliveryPhotoUrl = deliver.imageUrl;
            const fullScanDriver = false;
            order.status = tempStatus;
            order.deliveryName = deliveryName;
            order.deliveryId = deliveryId;
            order.deliveryPhone = deliveryPhone;
            order.deliveryPhotoUrl = deliveryPhotoUrl;
            order.fullScanDriver = fullScanDriver;
            await order.save();
            res.status(200).json({ message: 'da cap nhat orderGrab thanh cong' });
        }
        else {
            res.status(202).json({ message: 'Co tai xe khac cho' })
        }
    },
    //tai xe da giao hang
    DeliveredOrder: async (req, res) => {
        const userId = req.params.userId;
        const orderId = req.params.orderId;
        const status = req.body;
        // const deliver = await Deliver.findOne({ deliverId: userId });
        const order = await Order.findById(orderId);
        const { deliveryId, restaurantId } = order;
        const restaurant = await Restaurant.findOne({ restaurantId: restaurantId });
        if (userId === deliveryId) {
            order.status = status;
            await order.save();
            const { numberOrder } = restaurant;
            if (numberOrder) {
                const newCount = numberOrder + 1;
                restaurant.numberOrder = newCount;
                await restaurant.save();
            }
            else {
                restaurant.numberOrder = 1;
                await restaurant.save();
            }
            sendPushNotification(order.clientNotificationToken, 'Thông báo', 'Đơn hàng đã giao');
            sendPushNotification(order.restaurantNotificationToken, 'Thông báo', 'Đơn hàng đã giao');
            const currentDate = new Date();
            const startOfToday = new Date(new Date().setHours(0, 0, 0, 0)); // Bắt đầu từ 00:00:00
            const endOfToday = new Date(new Date().setHours(23, 59, 59, 999)); // Kết thúc lúc 23:59:59.999
            const items = order.items;
            items.forEach(async (item) => {
                const purchasedProduct = await PurchasedProduct.findOne({ productId: item.productId });
                if (purchasedProduct) {
                    const { quantity, quantityInDay, timestamp } = purchasedProduct;
                    purchasedProduct.quantity = quantity + item.quantity;
                    purchasedProduct.timestamp = currentDate;
                    purchasedProduct.quantityInDay = (timestamp >= startOfToday && timestamp <= endOfToday) ? (quantityInDay + item.quantity) : item.quantity;
                    purchasedProduct.price = item.price;
                    purchasedProduct.imageUrl = item.image.imageUrl;
                    purchasedProduct.name = item.name;
                    purchasedProduct.khuvuc = order.khuvuc;
                    purchasedProduct.category = item.category;
                    purchasedProduct.restaurantName = order.restaurantName;
                    purchasedProduct.restaurantImage = order.restaurantImage
                    await purchasedProduct.save();
                }
                else {
                    const data = {
                        productId: item.productId,
                        quantity: item.quantity,
                        timestamp: currentDate,
                        quantityInDay: item.quantity,
                        price: item.price,
                        imageUrl: item.image.imageUrl,
                        name: item.name,
                        khuvuc: order.khuvuc,
                        category: item.category,
                        restaurantName: order.restaurantName,
                        restaurantImage: order.restaurantImage,
                        restaurantId: order.restaurantId
                    }
                    const newPurchasedProduct = new PurchasedProduct(data);
                    await newPurchasedProduct.save();
                }

            })
            res.status(200).json({ message: 'don hang da giao' });

        }
        else {
            res.status(201).json({ message: 'da co tai xe khac giao' });
        }
    }

}
module.exports = orderController;