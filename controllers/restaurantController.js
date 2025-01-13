const User = require('../models/user');
const Restaurant = require('../models/restaurant');
const Product = require('../models/product');
const PurchasedProduct = require('../models/purchasedProduct');
const Review = require('../models/review');
const Region = require('../models/region');
const haversine = require('haversine');
const Order = require('../models/order');
const moment = require('moment-timezone');

const restaurantController = {
    //lay du lieu cac nha hang danh gia cao
    getRestaurantsBestRating: async (req, res) => {
        const id = req.params.khuvucId;
        const pageNumber = parseInt(req.query.page) || 1;
        const perPage = 10;
        const skip = (pageNumber - 1) * perPage;
        try {
            const restaurants = await Restaurant.find({ 'khuvuc.khuvucId': id }).sort({ rating: -1 }).sort({ numRatings: -1 }).skip(skip).limit(perPage);
            res.status(200).json(restaurants);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    //lay du lieu cac nha hang pho bien
    getRestaurantsPopularSelling: async (req, res) => {
        const id = req.params.khuvucId;
        const pageNumber = parseInt(req.query.page) || 1;
        const perPage = 10;
        const skip = (pageNumber - 1) * perPage;
        try {
            const restaurants = await Restaurant.find({ 'khuvuc.khuvucId': id }).sort({ numberOrder: -1 }).skip(skip).limit(perPage);
            res.status(200).json(restaurants);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    //lay du lieu tat ca nha hang
    getRestaurants: async (req, res) => {
        const khuvucId = req.params.khuvucId;
        const clientLatitude = parseFloat(req.params.latitude);
        const clientLongitude = parseFloat(req.params.longitude);
        const perPage = 10;
        const page = req.query.page || 1;
        try {
            // Tìm tất cả nhà hàng ở khuvucId
            const restaurants = await Restaurant.find({ 'khuvuc.khuvucId': khuvucId });
            // Tính toán khoảng cách từ clientLocation đến từng nhà hàng và thêm vào mảng
            const restaurantsWithDistance = restaurants.map(restaurant => {
                const restaurantLatitude = parseFloat(restaurant._doc.location.latitude);
                const restaurantLongitude = parseFloat(restaurant._doc.location.longitude);

                const distance = haversine(
                    { latitude: clientLatitude, longitude: clientLongitude },
                    { latitude: restaurantLatitude, longitude: restaurantLongitude },
                );
                return { ...restaurant._doc, distance };
            });
            // Sắp xếp nhà hàng theo thứ tự tăng dần của khoảng cách
            restaurantsWithDistance.sort((a, b) => a.distance - b.distance);
            // Phân trang
            const slicedRestaurants = restaurantsWithDistance.slice((page - 1) * perPage, page * perPage);
            res.status(200).json(slicedRestaurants);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    //Lay du lieu cua hang duoc chon tu danh muc
    // Lấy dữ liệu cửa hàng được chọn từ danh mục
    getDanhmucduocchon: async (req, res) => {
        const khuvucId = req.params.khuvucId;
        try {
            const region = await Region.findById(khuvucId);
            const danhmucduocchon = region._doc.danhmucduocchon; // Không cần _doc
            const dateTime = new Date();
            const hours = dateTime.getHours();

            // Tạo danh sách các promise cho từng danh mục
            const promises = danhmucduocchon
                .filter(dm => hours + 7 >= dm.fromHours && hours + 7 <= dm.toHours) // Chỉ giữ những dm thoả điều kiện
                .map(async (dm) => {
                    const purchasedProducts = await PurchasedProduct.find({ 'category.categoryId': dm._id })
                        .sort({ quantity: -1 })
                        .limit(10);

                    // Gắn thêm title vào kết quả
                    return { title: dm.title, products: purchasedProducts };
                });

            // Chạy tất cả truy vấn song song và chờ hoàn tất
            const _danhmucduocchon = await Promise.all(promises);

            res.status(200).json(_danhmucduocchon);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    //Tim kiem cua hang
    searchRestaurant: async (req, res) => {
        const khuvucId = req.params.khuvucId;
        const searchTerm = req.params.searchTerm;

        try {
            // Tìm kiếm nhà hàng dựa trên từ khóa searchTerm chứa ký tự
            const restaurants = await Restaurant.find({
                'khuvuc.khuvucId': khuvucId,
                $or: [
                    { name: { $regex: new RegExp(`.*${searchTerm}.*`, 'i') } }, // 'i' để không phân biệt chữ hoa chữ thường
                ]
            });

            // Trả về kết quả tìm kiếm
            res.status(200).json(restaurants);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Đã xảy ra lỗi khi tìm kiếm nhà hàng.' });
        }
    },
    //Tim kiem san pham
    searchProduct: async (req, res) => {
        const khuvucId = req.params.khuvucId;
        const searchTerm = req.params.searchTerm;
        try {
            const products = await Product.find({ $or: [{ name: { $regex: new RegExp(`.*${searchTerm}.*`, 'i') } }], khuvucId: khuvucId });
            res.status(200).json(products);
        }
        catch (err) {
            res.status(500).json({ message: 'Đã xảy ra lỗi khi tìm kiếm san pham.' });

        }
    },
    //Tim kiem nha hang tu san pham
    searchRestaurantFromProduct: async (req, res) => {
        const restaurantId = req.params.restaurantId;
        console.log('rreee', restaurantId);
        try {
            const restaurant = await Restaurant.findOne({ restaurantId: restaurantId });
            res.status(200).json(restaurant);
        }
        catch (err) {
            res.status(500).json({ message: 'khong co nha hang' });
        }


    },
    // Sản phẩm bán chạy trong ngày
    bestSellerInDay: async (req, res) => {
        const khuvucId = req.params.khuvucId;

        // Thiết lập múi giờ Việt Nam
        const vietNamTimezone = 'Asia/Ho_Chi_Minh';

        // Lấy thời điểm bắt đầu và kết thúc của ngày hôm nay theo giờ Việt Nam
        const startOfToday = moment().tz(vietNamTimezone).startOf('day').toDate();
        const endOfToday = moment().tz(vietNamTimezone).endOf('day').toDate();

        // Tìm các sản phẩm đã được mua trong khoảng thời gian đã xác định
        const purchasedProducts = await PurchasedProduct.find({
            'khuvuc.khuvucId': khuvucId,
            timestamp: { $gte: startOfToday, $lte: endOfToday }
        })
            .sort({ quantityInDay: -1 })
            .limit(15);

        // Kiểm tra xem có sản phẩm nào không
        if (purchasedProducts.length === 0) {
            return res.status(404).json({ message: 'Không có sản phẩm bán chạy trong ngày' });
        }

        res.status(200).json(purchasedProducts);
    }


    ,
    //Go Product Card tu san pham ban chay
    goProductBestSellerInDay: async (req, res) => {
        const restaurantId = req.params.restaurantId;
        const productId = req.params.productId;
        const restaurant = await Restaurant.findOne({ restaurantId: restaurantId });
        const product = await Product.findById(productId);
        if (!restaurant || !product) {
            return res.status(402).json({ message: 'khong tim thay restaurant hoac produc' });
        }
        res.status(200).json({ restaurant, product });
    },
    //Lay du lieu categories tu products trong cua hang
    getCategoriesFromProducts: async (req, res) => {
        try {
            const id = req.params.restaurantId;
            const products = await Product.find({ restaurant: id });
            const uniqueCategoriesMap = new Map();
            products.forEach(product => {
                const category = product.category;
                const categoryId = category.categoryId;
                if (!uniqueCategoriesMap.has(categoryId) && product.enabled == true) {
                    uniqueCategoriesMap.set(categoryId, category);
                }
            });
            const uniqueCategoriesArray = Array.from(uniqueCategoriesMap.values());
            res.status(200).json(uniqueCategoriesArray);
        }
        catch (err) {
            res.status(500).json({ message: err.message });
        }
    },
    //Lay du lieu san pham tu cua hang
    getProductsFromRestaurant: async (req, res) => {
        const id = req.params.restaurantId;
        const pageNumber = parseInt(req.query.page) || 1;
        const perPage = 10;
        const skip = (pageNumber - 1) * perPage;
        try {
            const products = await Product.find({ restaurant: id, enabled: true }).skip(skip).limit(perPage);
            res.status(200).json(products);
        }
        catch (err) {
            console.log(err);
            res.status(500).json({ message: 'Loi lay san pham tu cua hang' })
        }
    },
    //lay du lieu products tu categoryId
    getProductsFromCategory: async (req, res) => {
        try {
            const restaurantId = req.params.restaurantId;
            const categoryId = req.params.categoryId;
            const perPage = 10
            const products = await Product.find({ restaurant: restaurantId, 'category.categoryId': categoryId, enabled: true }).limit(perPage);
            res.json(products);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
    //lay du lieu nhung san pham ban chay theo category
    getBestProductsFromCategory: async (req, res) => {
        const khuvucId = req.params.khuvucId;
        const categoryId = req.params.categoryId;
        const pageNumber = req.query.page;
        const perPage = 10
        const skip = (pageNumber - 1) * perPage;
        try {
            const purchasedProducts = await PurchasedProduct.find({ 'khuvuc.khuvucId': khuvucId, 'category.categoryId': categoryId }).sort({ quantity: -1 }).skip(skip);
            if (!purchasedProducts) {
                res.status(500).json({ message: 'khong co san pham ban chay' });
            }
            res.status(200).json(purchasedProducts);
        }
        catch (err) {
            console.log(err);
            res.status(500).json({ message: 'loi trong viec tim kiem nhung san pham ban chay' });
        }
    },
    //lay du lieu khi scroll san pham category
    getScrollProductsFromCategory: async (req, res) => {
        try {
            const restaurantId = req.params.restaurantId;
            const categoryId = req.params.categoryId;
            const pageNumber = parseInt(req.query.page) || 1;
            const perPage = 10;
            const skip = (pageNumber - 1) * perPage;
            const products = await Product.find({ restaurant: restaurantId, 'category.categoryId': categoryId, enabled: true }).skip(skip).limit(perPage);
            res.status(200).json(products);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
    //Lay danh gia cua hang 
    getReviewsRestaurant: async (req, res) => {
        const restaurantId = req.params.restaurantId;
        const pageNumber = parseInt(req.query.page) || 1;
        const perPage = 10;
        const skip = (pageNumber - 1) * perPage;
        try {
            const reviews = await Review.find({ restaurant: restaurantId }).sort({ timeStamp: -1 }).skip(skip).limit(perPage);
            if (!reviews) {
                return res.status(500).json({ message: 'khong ton tai nha hang' });
            }
            res.status(200).json(reviews);
        }
        catch (err) {
            res.status(500).json({ message: err.message });
        }
    },
    //dang ky cua hang
    createRestaurant: async (req, res) => {
        const userId = req.params.userId;
        const user = await User.findOne({ _id: userId });
        if (!user) {
            return res.status(500).json({ message: 'Khong tim thay user' })
        }
        const restaurantData = req.body;
        // console.log(restaurantData);
        const newRestaurant = new Restaurant(restaurantData);
        await newRestaurant.save();
        res.status(200).json({ message: 'da dang ky thanh cong cua hang' });
    },
    //lay thong tin cua hang
    getInfoRestaurant: async (req, res) => {
        const userId = req.params.userId;
        const restaurant = await Restaurant.findOne({ restaurantId: userId });
        if (!restaurant) {
            res.status(500).json({ message: 'khong co thong tin cua hang' });
        }
        else {
            res.status(200).json({ restaurantData: restaurant });
        }
    },
    //cap nhat active cua hang
    updateActiveRestaurant: async (req, res) => {
        const restaurantId = req.params.restaurantId;
        const data = req.body;
        const restaurant = await Restaurant.findOne({ _id: restaurantId });
        if (!restaurant) {
            res.status(500).json({ message: 'khong co thong tin cua hang' });
        }
        else {
            restaurant.active = data.active;
            await restaurant.save();
            res.status(200).json({ message: 'Cap nhat Active cua hang thanh cong' });
        }
    },
    //cap nhat cua hang
    updateRestaurant: async (req, res) => {
        const restaurantId = req.params.restaurantId;
        const data = req.body;
        try {
            const updatedRestaurant = await Restaurant.findOneAndUpdate({ _id: restaurantId }, data, { new: true });
            if (!updatedRestaurant) {
                return res.status(404).json({ message: 'Khong tim thay cua hang' });
            }
            const id = updatedRestaurant.restaurantId;
            res.status(200).json({ message: 'Cap nhat cua hang thanh cong' });
            const products = await Product.find({ restaurant: id });
            if (products.length === 0) {
                return res.status(500).json({ message: 'khong tim thay san pham' });
            }
            products.forEach(async (product) => {
                product.khuvucId = data.khuvuc.khuvucId;
                await product.save();
            })
            // res.status(201).json({ message: 'Cap nhat khu vuc cho san pham thanh cong' });
        }
        catch (err) {
            console.log(err)
            res.status(500).json({ message: 'Loi cap nhat cua hang' });
        }
    },
    // danh gia cua hang
    reviewsRestaurant: async (req, res) => {
        const restaurantId = req.params.restaurantId;
        const orderId = req.params.orderId;
        const reviewData = req.body;
        const review = await Review.findOne({ id: orderId });
        if (!review) {
            const newReview = new Review(reviewData);
            const saveReview = await newReview.save();
            const restaurant = Restaurant.findOne({ restaurantId: restaurantId });
            await restaurant.updateOne({ $push: { reviews: saveReview._id } });
        }
        else {
            const newDate = new Date();
            const lastDayReview = review.timeStamp; // Chuyển thành Date object
            const timeDiff = (newDate - lastDayReview) / (1000 * 60 * 60 * 24); // Tính số ngày chênh lệch
            if (timeDiff > 2) {
                return res.status(500).json({ message: 'Đánh giá cửa hàng đã mất hiệu lực.' });
            }
            else {
                const newReview = new Review(reviewData);
                await newReview.save();
            }
        }
        const reviews = await Review.find({ restaurant: restaurantId });
        let totalRating = 0;
        let numRatings = 0;
        const data = [0, 0, 0, 0, 0];
        reviews.forEach(review => {
            switch (review._doc.rating) {
                case 5:
                    data[0] = data[0] + 1
                    break;
                case 4:
                    data[1] = data[1] + 1
                    break;
                case 3:
                    data[2] = data[2] + 1
                    break;
                case 2:
                    data[3] = data[3] + 1
                    break;
                case 1:
                    data[4] = data[4] + 1
                    break;
                default:
                    break;
            }
            const rating = review._doc.rating;
            console.log('rating', rating);
            totalRating += rating;
            numRatings++;
        })
        // Tính trung bình đánh giá
        const restaurant = await Restaurant.findOne({ restaurantId: restaurantId });
        const averageRating = totalRating / numRatings;
        restaurant.rating = averageRating;
        restaurant.numRatings = numRatings;
        restaurant.stars = data;
        await restaurant.save();
        res.status(200).json({ message: 'da goi danh gia' });
    },
    //lay du lieu san pham cua cua hang de cap nhat 
    getUpdateProductsFromRestaurant: async (req, res) => {
        const id = req.params.restaurantId;
        const pageNumber = req.query.page || 1;
        const perPage = 10;
        const skip = (pageNumber - 1) * perPage;
        const products = await Product.find({ restaurant: id }).sort({ _id: -1 }).skip(skip).limit(perPage);
        if (products) {
            res.status(200).json({ productsData: products });
        }
        else {
            res.status(500).json({ message: 'khong co du lieu products' });
        }

    },
    //tao san pham
    createProduct: async (req, res) => {
        try {
            const id = req.params.restaurantId;
            const product = req.body;
            const newProduct = new Product(product);
            const saveProduct = await newProduct.save();
            const restaurant = Restaurant.findOne({ restaurantId: id });
            await restaurant.updateOne({ $push: { products: saveProduct._id } });
            res.status(200).json({ productId: saveProduct._id });
        }
        catch (err) {
            console.log(err);
        }

    },
    //cap nhat active san pham
    updateActiveProduct: async (req, res) => {
        try {
            const id = req.params.productId;
            const product = await Product.findById(id)
            if (!product) {
                return res.status(500).json({ message: 'khong co san pham trong cua hang' });
            }
            product.enabled = !product.enabled;
            await product.save();
            res.status(200).json({ message: 'cap nhat active san pham thanh cong', product: product });
        }
        catch (err) {
            console.log(err);
        }
    },
    //cap nhat san pham
    updateProduct: async (req, res) => {
        try {
            const id = req.params.productId;
            const data = req.body;
            // Cập nhật dữ liệu trực tiếp vào sản phẩm dựa trên id
            const updatedProduct = await Product.findByIdAndUpdate(id, data, { new: true });

            if (!updatedProduct) {
                return res.status(500).json({ message: 'Không tìm thấy sản phẩm để cập nhật' });
            }
            res.status(200).json(updatedProduct); // Trả về sản phẩm đã được cập nhật thành công
        } catch (err) {
            console.log(err);
            res.status(500).json({ message: 'Đã xảy ra lỗi khi cập nhật sản phẩm' });
        }
    },
    //delete san pham
    deleteProduct: async (req, res) => {
        try {
            const id = req.params.productId;
            const deletedProduct = await Product.findByIdAndDelete(id);
            if (!deletedProduct) {
                return res.status(500).json({ message: 'Không tìm thấy sản phẩm để cập nhật' });
            }
            await Restaurant.updateMany(
                { 'products': { $in: [id] } }, // Tìm những documents có id sản phẩm trong mảng products
                { $pull: { 'products': id } }, // Xóa id sản phẩm khỏi mảng products
                { multi: true } // Đảm bảo cập nhật cho nhiều document
            );
            res.status(200).json({ message: 'Xoa san pham thanh cong' });
        }
        catch (err) {
            console.log(err)
        }
    },
    //Lay du lieu cua hang tu danh sach nha hang
    getRestaurantFromRestaurants: async (req, res) => {
        try {
            const id = req.params.id;
            const restaurant = await Restaurant.findById(id);
            if (!restaurant) {
                return res.status(500).json({ message: 'Không tìm thấy cua hang' });
            }
            res.status(200).json(restaurant);
        }
        catch (err) {
            console.log(err);
        }
    },
    //Lay du lieu cua hang tu danh sach nha hang
    getRestaurantFromDanhmucduocchon: async (req, res) => {
        try {
            const restaurantId = req.params.restaurantId;
            const restaurant = await Restaurant.findOne({ restaurantId: restaurantId });
            if (!restaurant) {
                return res.status(500).json({ message: 'Không tìm thấy cua hang' });
            }
            res.status(200).json(restaurant);
        }
        catch (err) {
            console.log(err);
        }
    },
    //Lay du lieu supportShip tu cua hang
    getSupportShipFromRestaurant: async (req, res) => {
        try {
            const id = req.params.id;
            const restaurant = await Restaurant.findOne({ restaurantId: id });
            if (!restaurant) {
                return res.status(500).json({ message: 'Không tìm thấy cua hang' });
            }
            const supportShips = restaurant.supportShips;
            res.status(200).json(supportShips);
        }
        catch (err) {
            console.log(err);
        }
    },
    //cap nhat du lieu supportShip tu cua hang
    updateSupportShipFromRestaurant: async (req, res) => {
        try {
            const id = req.params.id;
            const data = req.body;
            const restaurant = await Restaurant.findOne({ restaurantId: id });
            if (!restaurant) {
                return res.status(500).json({ message: 'Không tìm thấy cua hang' });
            }
            restaurant.supportShips = data;
            await restaurant.save();
            res.status(200).json({ message: 'cap nhat supportShips thanh cong' });
        }
        catch (err) {
            console.log(err);
        }
    },

    //lay du lieu doanh thu tu cua hang
    getRevenueRestaurant: async (req, res) => {
        try {
            const id = req.params.id;
            const mode = req.params.mode;
            const date = new Date(req.params.date).toLocaleString();
            const year = parseInt(req.params.year, 10);  // Chuyển đổi kiểu chuỗi sang số
            const month = parseInt(req.params.month, 10); // Chuyển đổi kiểu chuỗi sang số
            let totalRevenue = 0;

            if (mode === 'date') {
                // Thiết lập múi giờ Việt Nam
                const vietNamTimezone = 'Asia/Ho_Chi_Minh';

                // Lấy thời điểm bắt đầu và kết thúc của ngày hôm nay theo giờ Việt Nam
                const startOfToday = moment(date).tz(vietNamTimezone).startOf('day').toDate();
                const endOfToday = moment(date).tz(vietNamTimezone).endOf('day').toDate();


                // Tìm hóa đơn trong ngày đó
                const orders = await Order.find({
                    restaurantId: id,
                    createdAt: {
                        $gte: startOfToday,
                        $lt: endOfToday
                    },
                    "status.name": { $nin: ["Đang xử lý", "Chấp nhận", "Đã huỷ"] }
                });


                // Tính tổng doanh thu
                totalRevenue = orders.reduce((total, order) => total + order.totalAmount - order.transportFee, 0);

            } else if (mode === 'month') {
                const startDate = new Date(year, month - 1, 1); // Tháng điều chỉnh từ [0-11]
                const endDate = new Date(year, month, 1); // Đầu tháng tiếp theo

                // Tìm hóa đơn trong tháng đó
                const orders = await Order.find({
                    restaurantId: id,
                    createdAt: {
                        $gte: startDate,
                        $lt: endDate
                    },
                    "status.name": { $nin: ["Đang xử lý", "Chấp nhận", "Đã huỷ"] }

                });

                // Tính tổng doanh thu
                totalRevenue = orders.reduce((total, order) => total + order.totalAmount - order.transportFee, 0);

            } else if (mode === 'year') {
                const startDate = new Date(year, 0, 1); // Bắt đầu năm
                const endDate = new Date(year + 1, 0, 1); // Bắt đầu năm sau

                // Tìm hóa đơn trong năm đó
                const orders = await Order.find({
                    restaurantId: id,
                    createdAt: {
                        $gte: startDate,
                        $lt: endDate
                    },
                    "status.name": { $nin: ["Đang xử lý", "Chấp nhận", "Đã huỷ"] }

                });

                // Tính tổng doanh thu
                totalRevenue = orders.reduce((total, order) => total + order.totalAmount - order.transportFee, 0);
            }

            // Trả kết quả doanh thu về cho client
            res.status(200).json({ totalRevenue });

        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    }


}
module.exports = restaurantController;