const Restaurant = require('../models/restaurant');
const Deliver = require('../models/deliver');
const User = require('../models/user');

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
    updateDeliver:async(req,res) =>{
        const deliverId = req.params.deliverId; 
        const data = req.body;
        const deliver = await Deliver.findOne({ _id: deliverId });
        if (!deliver) {
            return res.status(500).json({ message: 'khong co thong tin tai xe' });
        }
        else {
            deliver.tiencuoc = parseFloat(data.tiencuoc);
            await deliver.save();
            res.status(200).json({ message:'da cap nhat tien cuoc tai xe thanh cong' });
        }
    },
    loginAdmin:async(req,res)=>{
        const email = req.params.email;
        const user = await User.findOne({ email: { $regex: new RegExp('^' + email, 'i') } })
        const data = req.body;
        if(!user){
            return res.status(500).json({message:'không có user admin'})
        }
        const currentPassword = user.password;
        if(currentPassword !== data.password){
            return res.status(402).json({message:'không đúng password admin'});
        }
        console.log(user.admin);
        if(user.admin === false){
            return res.status(403).json({message:'không phải là admin'});
        }
        res.status(200).json({message:'dang nhap user admin thanh cong'});
    },
    deleteDeliver:async(req,res)=>{
        const id = req.params.deliverId;
        Deliver.deleteOne({ _id: id }, (err) => {
            if (err) {
                console.log('loi xoa deliver tu admin');
                res.status(500).json({message:'xoa tai xe khong thanh cong tu admin'})
              // Xử lý lỗi
            } else {
                console.log('xoa thanh cong deliver');
                res.status(200).json({message:'xoá thành công tài xế'});
              // Xóa thành công
            }
          });
    },
    deleteRestaurant:async(req,res)=>{
        const id = req.params.restaurantId;
        Restaurant.deleteOne({ _id: id }, (err) => {
            if (err) {
                console.log('loi xoa restaurant tu admin');
                res.status(500).json({message:'xoa restaurant khong thanh cong tu admin'})
              // Xử lý lỗi
            } else {
                console.log('xoa thanh cong cửa hàng');
                res.status(200).json({message:'xoá thành công cửa hàng'});
              // Xóa thành công
            }
          });
    }
}
module.exports = adminController;