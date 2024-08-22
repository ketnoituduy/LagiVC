const User = require('../models/user');
const Restaurant = require('../models/restaurant');
const Deliver = require('../models/deliver');
const userController = {
    //thay doi password
    resetPassword: async (req, res) => {
        const userId = req.params.userId;
        const { oldPassword, newPassword } = req.body;
        const user = await User.findOne({ _id: userId });
        if (!user) {
            return res.status(500).json({ message: 'khong co user ton tai' });
        }
        if (user.password !== oldPassword) {
            return res.status(500).json({ message: 'Password cu da bi sai' });
        }
        user.password = newPassword;
        await user.save();
        res.status(200).json({ message: 'Thay doi password thanh cong' });
    },

    //lay du lieu region cua User
    regionUser: async (req, res) => {
        const id = req.params.userId;
        const user = await User.findOne({ _id: id });
        if (!user) {
            return res.status(500).json({ message: 'khong co user' });
        }
        const khuvuc = user.khuvuc;
        res.status(200).json(khuvuc);
    },

    //xoa User
    deleteAccount: async (req, res) => {
        try {
            const userId = req.params.userId;
            const userData = req.body;
            // Xác thực người dùng và kiểm tra mật khẩu
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'Người dùng không tồn tại' });
            }
            // const isPasswordValid = await comparePassword(userData.password, user.password);
            // console.log(isPasswordValid)
            if (user.password !== userData.password) {
                return res.status(401).json({ message: 'Mật khẩu không hợp lệ' });
            }
            const restaurant = await Restaurant.findOne({ restaurantId: userId });
            const deliver = await Deliver.findOne({ deliverId: userId });
            if (restaurant || deliver) {
                // Nếu user đang liên kết với tài khoản restaurant hoặc deliver
                // Bạn có thể tự động tạo logic xử lý ở đây
                return res.status(409).json({ message: 'Không thể xóa người dùng vì đang liên kết với tài khoản restaurant hoặc deliver' });
            }
            // Xóa người dùng
            const deletedUser = await User.findByIdAndDelete(userId);
            if (deletedUser) {
                // await Restaurant.findOneAndDelete({ restaurantId: userId });
                // await Deliver.findOneAndDelete({ deliverId: userId });
                return res.status(200).json({ message: 'Người dùng đã được xóa' });
            } else {
                return res.status(500).json({ message: 'Lỗi khi xóa người dùng' });
            }

        } catch (error) {
            return res.status(500).json({ message: 'Lỗi máy chủ' });
        }
    },

    //lay thong tin User
    getUser: async (req, res) => {
        try {
            const id = req.params.userId;
            const user = await User.findOne({ _id: id });
            if (!user) {
                return res.status(500).json({ message: 'khong co user' });
            }
            const { name, phoneNumber, email, urlAvatar, location } = user;
            const data = {
                name,
                phoneNumber,
                email,
                urlAvatar,
                location
            }
            res.status(200).json(data);
        }
        catch (err) {
            console.log(err)
        }
    },

    //cap nhat thong tin User
    updateUser: async (req, res) => {
        try {
            const id = req.params.userId;
            const { name, phoneNumber, urlAvatar } = req.body;
            const user = await User.findOne({ _id: id });
            if (!user) {
                return res.status(500).json({ message: 'khong co user' });
            }
            user.name = name;
            user.phoneNumber = phoneNumber;
            user.urlAvatar = urlAvatar;
            await user.save();
            res.status(200).json({ message: 'Cap nhat thong tin user thanh cong' });
        }
        catch (err) {
            console.log(err)
        }
    },

    //cap nhat khu vuc cho User
    updateLocationUser: async (req, res) => {
        const id = req.params.userId;
        const user = await User.findOne({ _id: id });
        if (!user) {
            return res.status(500).json({ message: 'khong co user' });
        }
        const data = req.body;
        user.khuvuc = data;
        await user.save();
        res.status(200).json({ message: 'Cap nhat khu vuc thanh cong', data });
    },

    //Lay danh sach dia chi tu User
    getListAddressUser: async (req, res) => {
        const id = req.params.userId;
        const user = await User.findOne({ _id: id });
        if (!user) {
            return res.status(500).json({ message: 'khong co user' });
        }
        const listAddress = user.listLocation;
        await user.save();
        res.status(200).json(listAddress);
    },

    ////Them dia chi vao danh sach dia chi cua User
    addUserAddress: async (req, res) => {
        const id = req.params.userId;
        const user = await User.findOne({ _id: id });
        if (!user) {
            return res.status(500).json({ message: 'khong co user' });
        }
        const data = req.body;
        const listLocation = user.listLocation;
        try {
            if (listLocation.length === 0) {
                user.location = data.location;
                user.dayCreated = data.dayCreated;
                user.listLocation = data.listLocation;
                await user.save();
                res.status(200).json(data.listLocation);
            }
            else {
                const num = listLocation.length + 1;
                const newLocation = { ...data.location, id: num, index: listLocation.length };
                const newListLocation = [...listLocation, newLocation];
                const dayUpdated = (new Date()).toLocaleString();
                user.location = newLocation;
                user.dayUpdated = dayUpdated;
                user.listLocation = newListLocation;
                await user.save();
                res.status(200).json(newListLocation);
            }
        }
        catch (err) {
            console.log(err);
        }
    },
    //Luu vi tri cua user
    saveUserAddress: async (req, res) => {
        try {
            const id = req.params.userId;
            const user = await User.findOne({ _id: id });
            if (!user) {
                return res.status(500).json({ message: 'khong co user' });
            }
            const tempLocation = req.body;
            user.location = tempLocation;
            await user.save();
            res.status(200).json({ message: 'Da luu dia chi thanh cong' });
        }
        catch (err) {
            console.log(err);
        }

    },

    //xoa dia chi cua uer trong danh sach dia chi
    deleteUserAddress: async (req, res) => {
        const userId = req.params.userId;
        const index = req.params.index;
        try {
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            // Xoá địa chỉ từ listAddress dựa trên idAddress
            user.listLocation.splice(index, 1);
            // Lưu cập nhật vào cơ sở dữ liệu
            await user.save();
            res.status(200).json({ message: 'Address deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

}

module.exports = userController;