const Restaurant = require('../models/restaurant');
const Deliver = require('../models/deliver');
const User = require('../models/user');
const bcrypt = require('bcryptjs');

const adminController = {
    getRestaurants: async (req, res) => {
        const pageNumber = req.query.page;
        const perPage = 10;
        const skip = (pageNumber - 1) * perPage;
        const restaurants = await Restaurant.find().sort({ _id: -1 }).skip(skip).limit(perPage);
        if (restaurants) {
            res.status(200).json(restaurants);
        }
        else {
            res.status(500).json({ message: 'khong co du lieu cua hang' });
        }
    },
    updateActiveRestaurant: async (req, res) => {
        const restaurantId = req.params.restaurantId;
        const restaurant = await Restaurant.findOne({ _id: restaurantId });
        if (!restaurant) {
            return res.status(500).json({ message: 'khong co thong tin cua hang' });
        }
        else {
            restaurant.isActive = !restaurant.isActive;
            await restaurant.save();
            const isActive = restaurant.isActive;
            res.status(200).json({ isActive });
        }
    },
    getDelivers: async (req, res) => {
        const pageNumber = req.query.page;
        const perPage = 10;
        const skip = (pageNumber - 1) * perPage;
        const delivers = await Deliver.find().sort({ _id: -1 }).skip(skip).limit(perPage);
        if (delivers) {
            res.status(200).json(delivers);
        }
        else {
            res.status(500).json({ message: 'khong co du lieu tai xe' });
        }
    },
    updateActiveDeliver: async (req, res) => {
        const deliverId = req.params.deliverId;
        const deliver = await Deliver.findOne({ _id: deliverId });
        if (!deliver) {
            return res.status(500).json({ message: 'khong co thong tin tai xe' });
        }
        else {
            deliver.isActive = !deliver.isActive;
            await deliver.save();
            const isActive = deliver.isActive;
            res.status(200).json({ isActive });
        }
    },
    updateDeliver: async (req, res) => {
        const deliverId = req.params.deliverId;
        const data = req.body;
        const deliver = await Deliver.findOne({ _id: deliverId });
        if (!deliver) {
            return res.status(500).json({ message: 'khong co thong tin tai xe' });
        }
        else {
            deliver.tiencuoc = parseFloat(data.tiencuoc);
            await deliver.save();
            res.status(200).json({ message: 'da cap nhat tien cuoc tai xe thanh cong' });
        }
    },
    loginAdmin: async (req, res) => {
        try {
            const email = req.params.email;
            // const user = await User.findOne({ email: { $regex: new RegExp("^" + email, "i") } });
            const user = await User.findOne({ email: email }).collation({ locale: "en", strength: 2 });

            if (!user) {
                return res.status(404).json({ message: "Không có user admin" });
            }

            const { password } = req.body;

            // So sánh mật khẩu đã mã hóa
            const isMatch =  bcrypt.compareSync(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ message: "Mật khẩu không đúng" });
            }

            if (!user.admin) {
                return res.status(403).json({ message: "Không phải là admin" });
            }

            res.status(200).json({ message: "Đăng nhập admin thành công" });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Lỗi server" });
        }
    },
    deleteDeliver: async (req, res) => {
        try {
            // Lấy orderId từ request params
            const id = req.params.deliverId;

            // Kiểm tra xem đơn hàng có tồn tại không
            const deliver = await Deliver.findById(id);
            if (!deliver) {
                return res.status(404).json({ message: 'Deliver không tồn tại' });
            }
            await Deliver.findByIdAndDelete(id);
            res.status(200).json({ message: 'Đã xoá tài xế' });
        }
        catch (err) {
            console.log(err);
            res.status(500).json({ message: 'Đã xảy ra lỗi khi xóa tài xế' });
        }
    },
    deleteRestaurant: async (req, res) => {
        try {
            // Lấy orderId từ request params
            const id = req.params.restaurantId;

            // Kiểm tra xem đơn hàng có tồn tại không
            const restaurant = await Restaurant.findById(id);
            if (!restaurant) {
                return res.status(404).json({ message: 'Restaurant không tồn tại' });
            }
            await Restaurant.findByIdAndDelete(id);
            res.status(200).json({ message: 'Đã xoá cửa hàng' });
        }
        catch (err) {
            console.log(err);
            res.status(500).json({ message: 'Đã xảy ra lỗi khi xóa cua hang' });
        }
    }
}
module.exports = adminController;