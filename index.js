
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const haversine = require('haversine');

const app = express();
const port = process.env.PORT;
const ipAddress = process.env.IP_ADDRESS;
const cors = require('cors');


const User = require('./models/user');
const Restaurant = require('./models/restaurant');
const Product = require('./models/product');
const PurchasedProduct = require('./models/purchasedProduct');
const Order = require('./models/order');
const Deliver = require('./models/deliver');
const checkNearestDriver = require('./parameters/checkNearestDriver');

const mongoDb = process.env.MONGO_DB;

mongoose.connect(mongoDb).then(() => {
    console.log('da ket noi mongodb thanh cong');
}).catch(error => {
    console.log('loi ket noi mongodb', error);
})

const schemaDT = new mongoose.Schema({
});
const Khuvuc = mongoose.model('Khuvuc', schemaDT, 'khuvuc');
const Parameters = mongoose.model('Parameters', schemaDT, 'parameters');
const Categories = mongoose.model('Categories', schemaDT, 'categories');
const Restaurants = mongoose.model('Restaurants', schemaDT, 'restaurants');

const http = require('http').Server(app);
const socketIO = require('socket.io')(http, {
    cors: {
        origin: 'http://192.168.1.6:4000'
    }
})

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

let users = [];
const currentEmail = '';

// Xử lý các sự kiện kết nối từ client
socketIO.on('connection', (socket) => {
    console.log('A user connected', socket.id);
    socket.on('newOrder', async (data) => {
        const user = await User.findById(data.restaurantId);
        if (!user) {
            return;
        }
        const socketId = user.socketId;
        socketIO.to(socketId).emit('Server_NewOrder', { socketId }); // Gửi sự kiện 'Server_NewOrder' đến client có socketId tương ứng
        socket.emit('Server_NewOrder');
    })
    socket.on('RestaurantSendOrderToDelivers', async (data) => {
        const order = await Order.findById(data.orderId);
        if (!order) {
            return;
        }
        fetchDriversFromRestaurant(data, order);
    })
    socket.on('RestaurantCancelOrder', (data) => {
        const clientId = data.clientId
        const restaurantId = data.restaurantId
        socketIO.emit('Server_RestaurantCancelOrder', { clientId, restaurantId });
    })
    socket.on('ClientDeleteOrder', async(data) => {
        const user = await User.findById(data.restaurantId);
        const socketId = user.socketId;
        socketIO.to(socketId).emit('Server_ClientDeleteOrder');
        socket.emit('Server_ClientDeleteOrder');
    })
    socket.on('DeliverDanggiaoOrder',async(data)=>{
        const userRestaurant = await User.findById(data.restaurantId);
        const userClient = await User.findById(data.clientId);
        const restaurantSocketId = userRestaurant.socketId;
        const clientSocketId = userClient.socketId;
        socketIO.to(restaurantSocketId).emit('Server_RestaurantListenDanggiao');
        socketIO.to(clientSocketId).emit('Server_ClientListenDanggiao');
        socketIO.emit('Server_DeliverDanggiaoOrder',data);
    })
    socket.on('DeliverCancelOrder',async(data)=>{
        const order = await Order.findById(data.orderId);
        if (!order) {
            return;
        }
        fetchDriversFromDriver(data,order);
    })
    socket.on('disconnect', () => {
        console.log('da ngat ket noi', socket.id);
    })
});


http.listen(port, ipAddress, () => {
    console.log('Server dang hoat dong');
    console.log(ipAddress, port);
})

const createToken = (userId) => {
    const payload = {
        userId: userId
    };
    const secrectKey = crypto.randomBytes(20).toString('hex');
    const token = jwt.sign(payload, secrectKey);
    return token;
}

//goi email xac nhan
const sendVerificationEmail = async (email, verificationToken) => {
    const transpoter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD
        }
    })
    const mailOption = {
        from: 'Lagi VC',
        to: email,
        subject: 'Email verification',
        text: `Vui lòng nhấn link này để xác nhận Email của bạn : http://localhost:3000/verify/${verificationToken}`
    };
    try {
        await transpoter.sendMail(mailOption);
        console.log('goi email xac nhan thanh cong');
    }
    catch (error) {
        console.log('loi goi xac nhan Email');
    }
}

//goi Email lay lai mat khau
const sendGetPasswordEmail = async (email, password) => {
    const transpoter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD
        }
    })
    const mailOption = {
        from: 'Lagi VC',
        to: email,
        subject: 'Lấy lại Password',
        text: `Mật khẩu của bạn: ${password}`
    };
    try {
        await transpoter.sendMail(mailOption);
        console.log('goi email xac nhan thanh cong');
    }
    catch (error) {
        console.log('loi goi xac nhan Email');
    }
}

//dang ky tai khoan email
app.post('/register', async (req, res) => {
    try {
        const data = req.body;
        const user = await User.findOne({ email: data.email });
        if (user) {
            return res.status(500).json({ message: 'User da ton tai' });
        }
        const newUser = new User(data);
        newUser.verificationToken = crypto.randomBytes(20).toString("hex");
        await newUser.save();
        res.status(200).json({ message: 'thanh cong trong viec tao tai khoan' });
        sendVerificationEmail(newUser.email, newUser.verificationToken)
    }
    catch (error) {
        console.log('registion failed')
        res.status(500).json({ message: "registion failed" });
    }
})

//xac nhan email dang ky
app.get('/verify/:token', async (req, res) => {
    try {
        const token = req.params.token;
        const user = await User.findOne({ verificationToken: token });
        if (!user) {
            return res.status(500).json({ message: 'token khong duoc xac thuc' });
        }
        user.verified = true;
        user.verificationToken = undefined;

        await user.save();
        res.status(200).json({ message: 'Email da duoc xac nhan' });
    }
    catch (error) {
        console.log('error', error);
        res.status(500).json({ message: 'Loi xac nhan Email' });
    }
})


//Goi Email xac nhan 
app.post('/verifiedEmail/:email', async (req, res) => {
    const email = req.params.email;
    const user = await User.findOne({ email: email });
    if (!user) {
        return res.status(500).json({ message: 'khong co user ton tai' });
    }
    user.verificationToken = crypto.randomBytes(20).toString("hex");
    await user.save();
    res.status(200).json({ message: 'Goi email xac nhan thanh cong' });
    sendVerificationEmail(email, user.verificationToken);
})


// dang nhap tai khoan
app.post('/login', async (req, res) => {
    const { email, password, socketId } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(400).json({ message: 'User chua duoc dang ky' });
    }
    if (user.password != password) {
        return res.status(401).json({ message: 'Mat khau khong chinh xac' });
    }
    if (!user.verified) {
        return res.status(402).json({ message: 'Chua xac nhan Email dang ky' });
    }
    const token = createToken(user._id);
    user.socketId = socketId;
    await user.save();
    res.status(200).json({ token });
})

//Lay lai Password bị quên
app.post('/getPassword/:email', async (req, res) => {
    const email = req.params.email;
    const user = await User.findOne({ email: email });
    if (!user) {
        return res.status(500).json({ message: 'khong co user ton tai' });
    }
    const password = user.password;
    res.status(200).json({ message: 'Goi email lay lai password thanh cong' });
    sendGetPasswordEmail(email, password);
})

//Thay doi Password
app.post('/resetPassword/:userId', async (req, res) => {
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
})

//lay du lieu region cua User
app.get('/regionUser/:userId', async (req, res) => {
    const id = req.params.userId;
    const user = await User.findOne({ _id: id });
    if (!user) {
        return res.status(500).json({ message: 'khong co user' });
    }
    const khuvuc = user.khuvuc;
    res.status(200).json(khuvuc);
})

//lay thong tin User
app.get('/users/:userId', async (req, res) => {
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
})
//cap nhat thong tin User
app.post('/users/:userId', async (req, res) => {
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
})

//cap nhat khuvuc cho user
app.post('/capnhatKhuvuc/:userId', async (req, res) => {
    const id = req.params.userId;
    const user = await User.findOne({ _id: id });
    if (!user) {
        return res.status(500).json({ message: 'khong co user' });
    }
    const data = req.body;
    user.khuvuc = data;
    await user.save();
    res.status(200).json({ message: 'Cap nhat khu vuc thanh cong', data });
})

//Lay danh sach dia chi tu User
app.get('/listAddress/:userId', async (req, res) => {
    const id = req.params.userId;
    const user = await User.findOne({ _id: id });
    if (!user) {
        return res.status(500).json({ message: 'khong co user' });
    }
    const listAddress = user.listLocation;
    await user.save();
    res.status(200).json(listAddress);
})

//Them dia chi vao danh sach dia chi cua User
app.post('/addAddress/:userId', async (req, res) => {
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


})

//Luu vi tri cua user
app.post('/saveAddress/:userId', async (req, res) => {
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

})

//xoa dia chi cua uer trong danh sach dia chi
app.put('/deleteAddress/:userId/:index', async (req, res) => {
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
})

//Lay du lieu khu vuc
app.get('/khuvuc', async (req, res) => {
    Khuvuc.find().then(data => {
        res.status(200).json(data);
    }).catch(err => {
        res.status(500).json({ message: 'loi truyen data khuvuc' });
    })
})

//Lay du lieu parameters
app.get('/parameters', async (req, res) => {
    Parameters.find().then(data => {
        res.status(200).json(data[0]);
    }).catch(err => {
        res.status(502).json({ message: 'loi truyen parameters' });
    })
})

//lay du lieu categories
app.get('/categories', async (req, res) => {
    Categories.find().then(data => {
        res.status(200).json(data);
    }).catch(err => {
        res.status(500).json({ message: 'loi truyen categories' });
    })
})

//lay du lieu cac nha hang danh gia cao
app.get('/restaurants/bestRating/:khuvucId', async (req, res) => {
    const id = req.params.khuvucId;
    const pageNumber = parseInt(req.query.page) || 1;
    const perPage = 10;
    const skip = (pageNumber - 1) * perPage;
    try {
        const restaurants = await Restaurants.find({ 'khuvuc.khuvucId': id }).sort({ rating: -1 }).sort({ numRatings: -1 }).skip(skip).limit(perPage);
        res.status(200).json(restaurants);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

//lay du lieu cac nha hang pho bien
app.get('/restaurants/popularSelling/:khuvucId', async (req, res) => {
    const id = req.params.khuvucId;
    const pageNumber = parseInt(req.query.page) || 1;
    const perPage = 10;
    const skip = (pageNumber - 1) * perPage;
    try {
        const restaurants = await Restaurants.find({ 'khuvuc.khuvucId': id }).sort({ numberOrder: -1 }).skip(skip).limit(perPage);
        res.status(200).json(restaurants);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})

//lay du lieu tat ca nha hang
app.get('/restaurants/nearByRestaurant/:khuvucId/:latitude/:longitude', async (req, res) => {
    const khuvucId = req.params.khuvucId;
    const clientLatitude = parseFloat(req.params.latitude);
    const clientLongitude = parseFloat(req.params.longitude);
    const perPage = 10;
    const page = req.query.page || 1;
    try {
        // Tìm tất cả nhà hàng ở khuvucId
        const restaurants = await Restaurants.find({ 'khuvuc.khuvucId': khuvucId });
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

})

//Tim kiem cua hang
app.get('/restaurants/search/:userId/:khuvucId/:searchTerm', async (req, res) => {
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
})

//Tim kiem san pham
app.get('/products/search/:userId/:khuvucId/:searchTerm', async (req, res) => {
    const khuvucId = req.params.khuvucId;
    const searchTerm = req.params.searchTerm;
    try {
        const products = await Product.find({ $or: [{ name: { $regex: new RegExp(`.*${searchTerm}.*`, 'i') } }], khuvucId: khuvucId });
        res.status(200).json(products);
    }
    catch (err) {
        res.status(500).json({ message: 'Đã xảy ra lỗi khi tìm kiếm san pham.' });

    }
})

//Tim kiem nha hang tu san pham
app.get('/product/restaurant/:restaurantId', async (req, res) => {
    const restaurantId = req.params.restaurantId;
    const restaurant = await Restaurant.findOne({ restaurantId: restaurantId });
    if (!restaurant) {
        res.status(500).json({ message: 'khong co nha hang' });
    }
    res.status(200).json(restaurant);
})


//Lay du lieu categories tu products trong cua hang
app.get('/:restaurantId/products/getCategories', async (req, res) => {
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
})

//Lay du lieu san pham tu cua hang
app.get('/:restaurantId/products', async (req, res) => {
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
})

//lay du lieu products tu categoryId
app.get('/:restaurantId/products/:categoryId', async (req, res) => {
    try {
        const restaurantId = req.params.restaurantId;
        const categoryId = req.params.categoryId;
        const perPage = 10
        const products = await Product.find({ restaurant: restaurantId, 'category.categoryId': categoryId, enabled: true }).limit(perPage);
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
})

//lay du lieu nhung san pham ban chay theo category
app.get('/bestProducts/:khuvucId/:categoryId', async (req, res) => {
    const khuvucId = req.params.khuvucId;
    const categoryId = req.params.categoryId;
    try {
        const purchasedProducts = PurchasedProduct.find({ 'khuvuc.khuvucId': khuvucId, 'category.categoryId': categoryId });
        if (!purchasedProducts) {
            res.status(500).json({ message: 'khong co san pham ban chay' });
        }
        res.status(200).json(purchasedProducts);
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ message: 'loi trong viec tim kiem nhung san pham ban chay' });
    }
})

//lay du lieu khi scroll san pham category
app.get('/:restaurantId/products/loadMore/:categoryId', async (req, res) => {
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
})

//Lay danh gia cua hang 
app.get('/:restaurantId/reviews', async (req, res) => {
    const restaurantId = req.params.restaurantId;
    const pageNumber = parseInt(req.query.page) || 1;
    const perPage = 10;
    const skip = (pageNumber - 1) * perPage;
    try {
        const restaurant = await Restaurant.findOne({ restaurantId: restaurantId }).skip(skip).limit(perPage).populate('reviews');
        if (!restaurant) {
            return res.status(500).json({ message: 'khong ton tai nha hang' });
        }
        const reviews = restaurant.reviews;
        res.status(200).json(reviews);
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
})

//dang ky cua hang
app.post('/dangkycuahang/:userId', async (req, res) => {
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
})

//Cap nhat socketId cho cua hang
// app.post('/capnhatSocketId/:userId/:socketId', async (req, res) => {
//     const id = req.params.userId;
//     const socketId = req.params.socketId;
//     const restaurant = await Restaurant.findOne({ restaurantId: id });
//     const deliver = await Deliver.findOne({ deliverId: id })
//     if (!restaurant) {
//         return res.status(402).json({ message: 'khong co cua hang' });
//     }
//     if (deliver) {
//         deliver.socketId = socketId;
//         await deliver.save();
//     }
//     restaurant.socketId = socketId;
//     await restaurant.save();
//     res.status(200).json({ message: 'da cap nhat socketId thanh cong', socketId: socketId });
// })


//lay thong tin cua hang
app.get('/thongtincuahang/:userId', async (req, res) => {
    const userId = req.params.userId;
    const restaurant = await Restaurant.findOne({ restaurantId: userId });
    if (!restaurant) {
        res.status(500).json({ message: 'khong co thong tin cua hang' });
    }
    else {
        res.status(200).json({ restaurantData: restaurant });
    }
})

//cap nhat active cua hang
app.post('/capnhatActiveCuahang/:restaurantId', async (req, res) => {
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
})

//cap nhat cua hang
app.post('/capnhatcuahang/:restaurantId', async (req, res) => {
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
})

//lay du lieu san pham
app.get('/products/:restaurantId', async (req, res) => {
    const id = req.params.restaurantId;
    const restaurant = await Restaurant.findOne({ restaurantId: id }).populate('products');
    if (!restaurant) {
        return res.status(500).json({ message: 'khong tim thay cua hang' });
    }
    const products = restaurant.products;
    res.status(200).json({ productsData: products });
})

//tao san pham 
app.post('/product/:restaurantId', async (req, res) => {
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

})

// cap nhat active san pham
app.post('/products/active/:productId', async (req, res) => {
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
})

//cap nhat san pham
app.post('/updateProduct/:productId', async (req, res) => {
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
});

//delete san pham
app.post('/deleteProduct/:productId', async (req, res) => {
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
})

//Lay du lieu cua hang
app.get('/restaurants/:id', async (req, res) => {
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
})

//tao order moi khi mua hang
app.post('/:userId/order', async (req, res) => {
    const userId = req.params.userId;
    const user = await User.findOne({ _id: userId });
    if (!user) {
        return res.status(500).json({ message: 'Khong tim thay user' })
    }
    const data = req.body;
    const newOrder = new Order(data);
    await newOrder.save()
    res.status(200).json({ message: 'tao hoa don moi thanh cong' });
})

//khach hang nhan orders
app.get('/client/getOrders/:userId', async (req, res) => {
    const userId = req.params.userId;
    const pageNumber = parseInt(req.query.page) || 1;
    const perPage = 10;
    const skip = (pageNumber - 1) * perPage;
    const orders = await Order.find({ clientId: userId }).sort({ _id: -1 }).skip(skip).limit(perPage);
    if (orders.length === 0) {
        return res.status(402).json({ message: 'khong co hoa don' });
    }
    res.status(200).json(orders);
})

//cua hang nhan orders
app.get('/restaurant/getOrders/:userId', async (req, res) => {
    const restaurantId = req.params.userId;
    const pageNumber = req.query.page;
    const perPage = 10;
    const skip = (pageNumber - 1) * perPage;
    const orders = await Order.find({ restaurantId: restaurantId }).sort({ _id: -1 }).skip(skip).limit(perPage);
    if (orders.length === 0) {
        return res.status(402).json({ message: 'khong co hoa don' });
    }
    res.status(200).json(orders);
})

//cua hang cancel order
app.post('/restaurant/cancelOrder/:orderId', async (req, res) => {
    const orderId = req.params.orderId;
    const data = req.body;
    const order = await Order.findById(orderId);
    order.status = data.status;
    order.restaurantNote = data.restaurantNote;
    await order.save();
    res.status(200).json({ message: 'Cancel hoa don thanh cong' });
})

//nhan orders tu tai xe
app.get('/deliver/getOrders/:khuvucId/:userId/:vehicleId', async (req, res) => {
    const deliverId = req.params.userId;
    const vehicleId = req.params.vehicleId;
    const khuvucId = req.params.khuvucId;
    const pageNumber = req.query.page;
    const perPage = 10;
    const skip = (pageNumber - 1) * perPage;
    const orders = await Order.find().sort({ _id: -1 }).skip(skip).limit(perPage);
    if (orders.length === 0) {
        return res.status(402).json({ message: 'khong co hoa don' });
    }
    const ordersFilter = orders.filter(order => (order.khuvuc.khuvucId === khuvucId
        && ((order.deliveryId === deliverId &&
            order.vehicleId === vehicleId) || (order.vehicleId === vehicleId &&
                order.status.name === 'Chấp nhận' && order.fullScanDriver === true))));
    res.status(200).json(ordersFilter);
})

//xoa order tu Client
app.delete('/deleteOrder/:orderId', async (req, res) => {
    try {
        // Lấy orderId từ request params
        const orderId = req.params.orderId;

        // Kiểm tra xem đơn hàng có tồn tại không
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Đơn hàng không tồn tại' });
        }
        if(order.status.name === 'Đang xử lý'){
            await Order.findByIdAndDelete(orderId);
            res.status(200).json({ message: 'Đơn hàng đã được xóa' });
        }
        else{
            res.status(402).json({message:'Đơn hàng này đã được chấp nhận, bạn không thể xoá'});
        }
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi xóa đơn hàng' });
    }
})

//tai xe chap nhan don hang tu cua hang
app.post('/deliverAcceptOrder/:userId/:orderId',async(req,res)=>{
    const userId = req.params.userId;
    const orderId = req.params.orderId;
    const deliver = await Deliver.findOne({deliverId:userId});
    const order = await Order.findById(orderId);
    const parameters = await Parameters.find();
    const tempParameters = parameters[0]._doc;
    if(!deliver || !order){
        return res.status(404).json({message:'khong ton tai tai xe hoac hoa don'})
    }
    const {tiencuoc} = deliver;
    const {feeDeliver, statusColors} = tempParameters;
    const {deliveryId, fullScanDriver,status } = order;
    if (deliveryId === '' || deliveryId === userId || ((fullScanDriver && status.name === 'Chấp nhận' && deliveryId === ''))) {
        if (tiencuoc < feeDeliver && status.name === 'Chấp nhận'){
            return res.status(201).json({message:'Tien cuoc khong du'});
        }
        else if(status.name === 'Chấp nhận'){
            const money = tiencuoc - feeDeliver;
            deliver.tiencuoc = money;
            await deliver.save();
        }
        const tempStatus = {name:'Đang giao', color: statusColors.dangGiao};
        const deliveryName = deliver.name;
        const deliveryId  = deliver.deliverId;
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
        res.status(200).json({message:'da cap nhat order thanh cong'});
    }
    else{
        res.status(202).json({message:'don hang co tai xe khac giao'})
    }
})



//dang ky tai xe
app.post('/dangkytaixe/:userId', async (req, res) => {
    const id = req.params.userId;
    const user = await User.findOne({ _id: id });
    if (!user) {
        return res.status(500).json({ message: 'Khong tim thay user' })
    }
    const data = req.body;
    const newDeliver = new Deliver(data);
    await newDeliver.save();
    res.status(200).json({ message: 'dang ky tai xe thanh cong' });
})

//lay thong tin tai xe
app.get('/getDeliver/:userId', async (req, res) => {
    const id = req.params.userId;
    const deliver = await Deliver.findOne({ deliverId: id });
    if (!deliver) {
        return res.status(402).json({ message: 'khong tim thay tai xe' });
    }
    res.status(200).json(deliver);
})

//cap nhat thong tin tai xe
app.post('/updatedDeliver/:userId', async (req, res) => {
    const id = req.params.userId;
    const data = req.body;
    const deliver = await Deliver.findOneAndUpdate({ deliverId: id }, data);
    if (!deliver) {
        return res.status(402).json({ message: 'khong tim thay tai xe' });
    }
    res.status(200).json({ message: 'cap nhat thong tin tai xe thanh cong' })
})

//cap nhat vi tri tai xe
app.post('/updatedLocationDeliver/:userId', async (req, res) => {
    const id = req.params.userId;
    const data = req.body;
    const deliver = await Deliver.findOneAndUpdate({ deliverId: id }, data);
    if (!deliver) {
        return res.status(402).json({ message: 'khong tim thay tai xe' });
    }
    res.status(200).json({ message: 'cap nhat vi tri tai xe thanh cong' })
})


const fetchDriversFromRestaurant = async (data,order) => {
    const orderId = data.orderId;
    const khuvucId = order.khuvuc.khuvucId;
    order.status = data.status;
    order.restaurantNote = data.restaurantNote;
    await order.save();
    let NearestDrivers = [];
    const parameters = await Parameters.find();
    const name = 'order';
    const timeRequest = parameters[0]._doc.requestDeliver;
    const vehicleId = '1';
    const feeDeliver = parameters[0]._doc.feeDeliver;
    await checkNearestDriver(data.currentRestaurantLocation, orderId, NearestDrivers, name, timeRequest, vehicleId, feeDeliver, khuvucId, socketIO);
}

const fetchDriversFromDriver = async(data,order) =>{
    const orderId = data.orderId;
    const deliverId = data.deliverId;
    const restaurantLocation = data.restaurantLocation;
    const khuvucId = order.khuvuc.khuvucId;
    const parameters = await Parameters.find();
    const tempParameters = parameters[0]._doc;
    const tempStatus = {name:'Chấp nhận',color:tempParameters.statusColors.chapNhan};
    if(order.deliveryId === deliverId){
        order.status = tempStatus;
        order.deliveryId = '';
        await order.save();
    }
    let NearestDrivers = [];
    NearestDrivers.push({deliverId: deliverId});
    const name = 'order';
    const timeRequest = parameters[0]._doc.requestDeliver;
    const vehicleId = '1';
    const feeDeliver = parameters[0]._doc.feeDeliver;
    await checkNearestDriver(restaurantLocation, orderId, NearestDrivers, name, timeRequest, vehicleId, feeDeliver, khuvucId, socketIO);
}

//tu dong cap nhat socketIO
app.post('/autoUpdateSocketIO/:userId/:socketId', async (req, res) => {
    const userId = req.params.userId;
    const socketId = req.params.socketId;
    const user = await User.findById(userId);
    if (!user) {
        return res.status(500).json({ message: 'khong co User' });
    }
    user.socketId = socketId;
    await user.save();
    res.status(200).json({ message: 'cap nhat socketId thanh cong', socketId });
})
