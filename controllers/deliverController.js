const User = require('../models/user');
const Deliver = require('../models/deliver');
const Parameter = require('../models/parameter');
const ReviewDeliver = require('../models/reviewDeliver');
const Order = require('../models/order');
const OrderGrab = require('../models/orderGrab');
const moment = require('moment-timezone');

const deliverController = {
    //dang ky tai xe
    createDeliver: async (req, res) => {
        const id = req.params.userId;
        const user = await User.findOne({ _id: id });
        if (!user) {
            return res.status(500).json({ message: 'Khong tim thay user' })
        }
        const data = req.body;
        const newDeliver = new Deliver(data);
        await newDeliver.save();
        res.status(200).json({ message: 'dang ky tai xe thanh cong' });
    },
    //lay thong tin tai xe
    getInfoDeliver: async (req, res) => {
        const id = req.params.userId;
        const deliver = await Deliver.findOne({ deliverId: id });
        if (!deliver) {
            return res.status(402).json({ message: 'khong tim thay tai xe' });
        }
        res.status(200).json(deliver);
    },
    //cap nhat thong tin tai xe
    updateDeliver: async (req, res) => {
        const id = req.params.userId;
        const data = req.body;
        const deliver = await Deliver.findOneAndUpdate({ deliverId: id }, data);
        if (!deliver) {
            return res.status(402).json({ message: 'khong tim thay tai xe' });
        }
        res.status(200).json({ message: 'cap nhat thong tin tai xe thanh cong' })
    },
    //cap nhat vi tri tai xe
    updateLocationDeliver: async (req, res) => {
        const id = req.params.userId;
        const data = req.body;
        const deliver = await Deliver.findOneAndUpdate({ deliverId: id }, data);
        if (!deliver) {
            return res.status(402).json({ message: 'khong tim thay tai xe' });
        }
        res.status(200).json({ message: 'cap nhat vi tri tai xe thanh cong' })
    },
    //lay vi tri cac te xe
    getLocationDelivers: async (req, res) => {
        const vehicleId = req.params.vehicleId;
        const khuvucId = req.params.khuvucId;
        const parameters = await Parameter.find();
        const tempParameters = parameters[0]._doc;
        const delivers = await Deliver.find({ isActive: true, tiencuoc: { $gte: tempParameters.feeDeliver }, 'khuvuc.khuvucId': khuvucId, vehicleId: vehicleId });
        if (!delivers) {
            return res.status(500).json({ message: 'khong co tai xe' });
        }
        const data = [];
        delivers.forEach(deliver => {
            const { latitude, longitude, name } = deliver._doc;
            data.push({ coordinate: { latitude: latitude, longitude: longitude }, id: deliver._id, name: name });

        })
        res.status(200).json(data);
    },
    //lay vi tri 1 tai xe
    getLocationDeliver: async (req, res) => {
        const deliverId = req.params.id;
        try {
            const deliver = await Deliver.findOne({ deliverId: deliverId });
            if (!deliver) {
                return res.status(404).json({ message: 'Tài xế không tồn tại' });
            }

            // Trả về lat và long của tài xế
            const { latitude, longitude, vehicleId,name } = deliver;
            return res.status(200).json({ latitude, longitude,vehicleId,name });
        } catch (err) {
            console.error(err); // Ghi lỗi nếu có để dễ dàng debug
            return res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy vị trí tài xế' });
        }
    },
    //Danh gia tai xe
    reviewDeliver: async (req, res) => {
        const deliverId = req.params.deliverId;
        const orderGrabId = req.params.orderGrabId;
        const data = req.body;
        const reviewDeliver = await ReviewDeliver.findOne({ id: orderGrabId });
        if (!reviewDeliver) {
            const newReviewDeliver = new ReviewDeliver(data);
            const saveReviewDeliver = await newReviewDeliver.save();
            const deliver = Deliver.findOne({ deliverId: deliverId });
            await deliver.updateOne({ $push: { reviews: saveReviewDeliver._id } });
        }
        else {
            const newDate = new Date();
            const lastDayReview = reviewDeliver.timeStamp; // Chuyển thành Date object
            const timeDiff = (newDate - lastDayReview) / (1000 * 60 * 60 * 24); // Tính số ngày chênh lệch
            if (timeDiff > 2) {
                return res.status(500).json({ message: 'Đánh giá tài xế đã mất hiệu lực.' });
            }
            else {
                await reviewDeliver.updateOne(data);
            }
        }
        const reviewsDeliver = await ReviewDeliver.find({ deliver: deliverId });
        let totalRating = 0;
        let numRatings = 0;
        reviewsDeliver.forEach(review => {
            const rating = review.rating;
            totalRating += rating;
            numRatings++;
        })
        // Tính trung bình đánh giá
        const averageRating = totalRating / numRatings;
        const deliver = await Deliver.findOne({ deliverId: deliverId });
        deliver.rating = averageRating;
        deliver.numRatings = numRatings;
        await deliver.save();
        res.status(200).json({ message: 'goi danh gia tai xe thanh cong' });
    },

    //lay du lieu doanh thu tu deliver
    getRevenueDeliver: async (req, res) => {
        try {
            const id = req.params.id;
            const mode = req.params.mode;
            const date = new Date(req.params.date).toLocaleString();
            const year = parseInt(req.params.year, 10);  // Chuyển đổi kiểu chuỗi sang số
            const month = parseInt(req.params.month, 10); // Chuyển đổi kiểu chuỗi sang số
            let totalRevenue = 0;
            let totalGrabRevenue = 0;
            let total = 0;

            if (mode === 'date') {
                // Thiết lập múi giờ Việt Nam
                const vietNamTimezone = 'Asia/Ho_Chi_Minh';

                // Lấy thời điểm bắt đầu và kết thúc của ngày hôm nay theo giờ Việt Nam
                const startOfToday = moment(date).tz(vietNamTimezone).startOf('day').toDate();
                const endOfToday = moment(date).tz(vietNamTimezone).endOf('day').toDate();
                // const startDate = new Date(date); // Đối tượng Date từ chuỗi

                // startDate.setHours(0, 0, 0, 0);
                // // startDate.setUTCHours(startDate.getUTCHours() + 7);
                // const endDate = new Date(startDate);
                // endDate.setHours(23, 59, 59, 999); // Thêm 1 ngày để bao gồm ngày hôm sau
                // // Chuyển đổi về UTC để truy vấn
                // const startDateUTC = new Date(startDate.getTime() - (7 * 60 * 60 * 1000)); // 0h VN về UTC
                // const endDateUTC = new Date(endDate.getTime()); // 23h59m59s VN về UTC
                // Tìm hóa đơn trong ngày đó
                const orders = await Order.find({
                    deliveryId: id,
                    createdAt: {
                        $gte: startOfToday,
                        $lt: endOfToday
                    },
                    "status.name": "Đã giao"

                });

                // Tìm hóa đơn Grab trong ngày đó
                const ordersGrab = await OrderGrab.find({
                    deliveryId: id,
                    createdAt: {
                        $gte: startOfToday,
                        $lt: endOfToday
                    },
                    "status.name": "Hoàn tất"
                });


                // Tính tổng doanh thu
                totalRevenue = orders.reduce((total, order) => total + order.transportFee, 0);
                totalGrabRevenue = ordersGrab.reduce((total, order) => total + order.transportFee, 0);
                total = totalRevenue + totalGrabRevenue;

            } else if (mode === 'month') {
                const startDate = new Date(year, month - 1, 1); // Tháng điều chỉnh từ [0-11]
                const endDate = new Date(year, month, 1); // Đầu tháng tiếp theo

                // Tìm hóa đơn trong tháng đó
                const orders = await Order.find({
                    deliveryId: id,
                    createdAt: {
                        $gte: startDate,
                        $lt: endDate
                    },
                    "status.name": "Đã giao"
                });

                // Tìm hóa đơn Grab trong ngày đó
                const ordersGrab = await OrderGrab.find({
                    deliveryId: id,
                    createdAt: {
                        $gte: startDate,
                        $lt: endDate
                    },
                    "status.name": "Hoàn tất"
                });

                // Tính tổng doanh thu
                totalRevenue = orders.reduce((total, order) => total + order.transportFee, 0);
                totalGrabRevenue = ordersGrab.reduce((total, order) => total + order.transportFee, 0);
                total = totalRevenue + totalGrabRevenue;

            } else if (mode === 'year') {
                const startDate = new Date(year, 0, 1); // Bắt đầu năm
                const endDate = new Date(year + 1, 0, 1); // Bắt đầu năm sau

                // Tìm hóa đơn trong năm đó
                const orders = await Order.find({
                    deliveryId: id,
                    createdAt: {
                        $gte: startDate,
                        $lt: endDate
                    },
                    "status.name": "Đã giao"
                });

                // Tìm hóa đơn Grab trong ngày đó
                const ordersGrab = await OrderGrab.find({
                    deliveryId: id,
                    createdAt: {
                        $gte: startDate,
                        $lt: endDate
                    },
                    "status.name": "Hoàn tất"
                });

                // Tính tổng doanh thu
                totalRevenue = orders.reduce((total, order) => total + order.transportFee, 0);
                totalGrabRevenue = ordersGrab.reduce((total, order) => total + order.transportFee, 0);
                total = totalRevenue + totalGrabRevenue;
            }

            // Trả kết quả doanh thu về cho client
            res.status(200).json({ total });

        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    },
    numOrderOfDeliver: async (req, res) => {
        try {
            const deliveryId = req.params.id;

            // Đếm số lượng hóa đơn mà không cần lấy toàn bộ dữ liệu
            const numOrders = await Order.countDocuments({ deliveryId });

            const deliver = await Deliver.findOne({ deliverId: deliveryId });
            if (!deliver) {
                return res.status(404).json({ message: 'Không tìm thấy tai xe' });
            }

            // Cập nhật số lượng hóa đơn và lưu
            deliver.numOrder = numOrders;
            await deliver.save();

            // Trả về kết quả
            res.status(200).json({ numOrder: numOrders });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    },
    getNumOrderDeliver: async (req, res) => {
        try {
            const deliveryId = req.params.id;
            const numOrder = await Order.countDocuments({ deliveryId });
            const deliver = await Deliver.findOne({ deliverId: deliveryId });
            if (!deliver) {
                return res.status(404).json({ message: 'Không tìm thấy tai xe' });
            }
            const numCurrentOrder = deliver.numOrder;
            const num = numOrder - numCurrentOrder;
            res.status(200).json({ number: num });
        }
        catch {
            console.error(err);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    },
    numOrderGrabOfDeliver: async (req, res) => {
        try {
            const deliveryId = req.params.id;

            // Đếm số lượng hóa đơn mà không cần lấy toàn bộ dữ liệu
            const numOrdersGrab = await OrderGrab.countDocuments({ deliveryId });

            const deliver = await Deliver.findOne({ deliverId: deliveryId });
            if (!deliver) {
                return res.status(404).json({ message: 'Không tìm thấy tai xe' });
            }

            // Cập nhật số lượng hóa đơn và lưu
            deliver.numOrderGrab = numOrdersGrab;
            await deliver.save();

            // Trả về kết quả
            res.status(200).json({ numOrderGrab: numOrdersGrab });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    },
    getNumOrderGrabDeliver: async (req, res) => {
        try {
            const deliveryId = req.params.id;
            const numOrderGrab = await OrderGrab.countDocuments({ deliveryId });
            const deliver = await Deliver.findOne({ deliverId: deliveryId });
            if (!deliver) {
                return res.status(404).json({ message: 'Không tìm thấy tai xe' });
            }
            const numCurrentOrderGrab = deliver.numOrderGrab;
            const num = numOrderGrab - numCurrentOrderGrab;
            res.status(200).json({ number: num });
        }
        catch {
            console.error(err);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    }

}
module.exports = deliverController;