const User = require('../models/user');
const Deliver = require('../models/deliver');
const Parameter = require('../models/parameter');
const ReviewDeliver = require('../models/reviewDeliver');
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
    //Danh gia tai xe
    reviewDeliver: async (req, res) => {
        const deliverId = req.params.deliverId;
        const orderGrabId = req.params.orderGrabId;
        const data = req.body;
        const reviewDeliver = await ReviewDeliver.findOneAndUpdate({ id: orderGrabId }, data);
        if (!reviewDeliver) {
            const newReviewDeliver = new ReviewDeliver(data);
            const saveReviewDeliver = await newReviewDeliver.save();
            const deliver = Deliver.findOne({ deliverId: deliverId });
            await deliver.updateOne({ $push: { reviews: saveReviewDeliver._id } });
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
    }
}
module.exports = deliverController;