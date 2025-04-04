const User = require('../models/user');
const Restaurant = require('../models/restaurant');
const Deliver = require('../models/deliver');
const bcrypt = require('bcryptjs');

const userController = {
    //thay doi password
    resetPassword: async (req, res) => {
        const userId = req.params.userId;
        const { oldPassword, newPassword } = req.body;

        try {
            // Tìm user theo userId
            const user = await User.findOne({ _id: userId });
            if (!user) {
                return res.status(404).json({ message: 'Không có user tồn tại' });
            }

            // So sánh mật khẩu cũ với mật khẩu đã mã hóa trong cơ sở dữ liệu
            const isMatch = bcrypt.compareSync(oldPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Mật khẩu cũ không đúng' });
            }

            // Mã hóa mật khẩu mới trước khi lưu vào cơ sở dữ liệu
            const salt = await bcrypt.genSalt(10);  // Tạo salt với mức độ bảo mật là 10
            const hashedPassword = await bcrypt.hash(newPassword, salt);

            // Cập nhật mật khẩu mới vào cơ sở dữ liệu
            user.password = hashedPassword;
            await user.save();

            // Gửi phản hồi thành công
            res.status(200).json({ message: 'Thay đổi mật khẩu thành công' });
        } catch (error) {
            console.error("Error resetting password:", error);
            res.status(500).json({ message: 'Đã xảy ra lỗi trong quá trình thay đổi mật khẩu' });
        }
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

            // Xác thực người dùng và lấy thông tin người dùng từ cơ sở dữ liệu
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'Người dùng không tồn tại' });
            }

            // So sánh mật khẩu người dùng nhập vào với mật khẩu đã mã hóa trong cơ sở dữ liệu
            const isPasswordValid =  bcrypt.compareSync(userData.password, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({ message: 'Mật khẩu không hợp lệ' });
            }

            // Kiểm tra xem người dùng có liên kết với tài khoản restaurant hoặc deliver không
            const restaurant = await Restaurant.findOne({ restaurantId: userId });
            const deliver = await Deliver.findOne({ deliverId: userId });
            if (restaurant || deliver) {
                return res.status(409).json({ message: 'Không thể xóa người dùng vì đang liên kết với tài khoản restaurant hoặc deliver' });
            }

            // Xóa người dùng
            const deletedUser = await User.findByIdAndDelete(userId);
            if (deletedUser) {
                // Bạn có thể thêm các lệnh xóa dữ liệu liên quan nếu cần
                // await Restaurant.findOneAndDelete({ restaurantId: userId });
                // await Deliver.findOneAndDelete({ deliverId: userId });
                return res.status(200).json({ message: 'Người dùng đã được xóa' });
            } else {
                return res.status(500).json({ message: 'Lỗi khi xóa người dùng' });
            }

        } catch (error) {
            console.error('Error deleting account:', error);
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