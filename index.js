
require('dotenv').config();
const express = require('express');
const rateLimit = require("express-rate-limit");
const bodyParser = require('body-parser');
const helmet = require('helmet');
const mongoose = require('mongoose');

const app = express();
const port = process.env.PORT || 4000;
const ipAddress = process.env.IP_ADDRESS;
const cors = require('cors');

const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 1500, // số lượng request tối đa trong windowMs cho mỗi IP
    message: "Quá nhiều yêu cầu từ IP của bạn, vui lòng thử lại sau một thời gian."
  });
app.use(helmet());
app.use(limiter);

const User = require('./models/user');
const Restaurant = require('./models/restaurant');
const Order = require('./models/order');
const Deliver = require('./models/deliver');
const Ad = require('./models/ad');
const Region = require('./models/region');
const Parameter = require('./models/parameter');
const Category = require('./models/category');
const OrderGrab = require('./models/orderGrab');
const Version = require('./models/version');


const checkNearestDriver = require('./parameters/checkNearestDriver');
const checkNearestDriverGrab = require('./parameters/checkNearestDriverGrab');

const userRouter = require('./routes/user');
const restaurantRouter = require('./routes/restaurant');
const orderRouter = require('./routes/order');
const deliverRouter = require('./routes/deliver');
const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');

const mongoDb = process.env.MONGO_DB;

mongoose.connect(mongoDb).then(() => {
    console.log('da ket noi mongodb thanh cong');
}).catch(error => {
    console.log('loi ket noi mongodb', error);
})


// const Restaurants = mongoose.model('Restaurants', schemaDT, 'restaurants');

const http = require('http').Server(app);
const socketIO = require('socket.io')(http, {
    cors: {
        origin: 'http://192.168.1.6:4000'
    }
})

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

http.listen(port, () => {
    console.log('Server dang hoat dong');
    console.log(ipAddress, port);
})
// Xử lý các sự kiện kết nối từ client
socketIO.on('connection', (socket) => {
    console.log('A user connected', socket.id);
    socket.on('AutoUpdateSocketIO', (data) => {
        socket.join(data.khuvucId);
    })
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
    socket.on('ClientDeleteOrder', async (data) => {
        const user = await User.findById(data.restaurantId);
        const socketId = user.socketId;
        socketIO.to(socketId).emit('Server_ClientDeleteOrder');
        socket.emit('Server_ClientDeleteOrder');
    })
    socket.on('DeliverDanggiaoOrder', async (data) => {
        const userRestaurant = await User.findById(data.restaurantId);
        const userClient = await User.findById(data.clientId);
        const restaurantSocketId = userRestaurant.socketId;
        const clientSocketId = userClient.socketId;
        socketIO.to(restaurantSocketId).emit('Server_RestaurantListenDanggiao');
        socketIO.to(clientSocketId).emit('Server_ClientListenDanggiao');
        socketIO.emit('Server_DeliverDanggiaoOrder', data);
    })
    socket.on('DeliverCancelOrder', async (data) => {
        const order = await Order.findById(data.orderId);
        if (!order) {
            return;
        }
        fetchDriversFromDriver(data, order);
    })
    socket.on('DeliveredOrder', async (data) => {
        const restaurant = await User.findById(data.restaurantId);
        const client = await User.findById(data.clientId);
        const restaurantSocketId = restaurant.socketId;
        const clientId = client.socketId;
        socket.emit('Server_DeliveredOrder');
        socketIO.to(restaurantSocketId).emit('Server_DeliveredOrder');
        socketIO.to(clientId).emit('Server_DeliveredOrder');
    })

    socket.on('ClientSendOrderGrabToDelivers', async (data) => {
        const orderGrab = await OrderGrab.findById(data.orderGrabId);
        if (!orderGrab) {
            return;
        }
        fetchDriversFromClient(data);
    })

    socket.on('ClientDeleteOrderGrab', async (data) => {
        if (data.deliverId !== '') {
            const user = await User.findById(data.deliverId);
            const socketId = user.socketId;
            socketIO.to(socketId).emit('Server_ClientDeleteOrderGrab_Driver', { vehicleId: data.vehicleId });
        }
        else {
            socketIO.to(data.khuvucId).emit('Server_ClientDeleteOrderGrab_Driver', { vehicleId: data.vehicleId });
        }
        socket.emit('Server_ClientDeleteOrderGrab_Client', { vehicleId: data.vehicleId });
    })

    socket.on('DeliverDangdonkhach', async (data) => {
        const clientId = data.clientId;
        const client = await User.findById(clientId);
        if (!client) {
            return;
        }
        const socketId = client.socketId;
        const khuvucId = data.khuvucId;
        if (data.deliverId !== '') {
            socket.emit('Server_DeliverDangdonkhach_Driver', { vehicleId: data.vehicleId });
        }
        else {
            console.log(data.deliverId, 'bbb');
            socketIO.to(khuvucId).emit('Server_DeliverDangdonkhach_Driver', { vehicleId: data.vehicleId });
        }
        socketIO.to(socketId).emit('Server_DeliverDangdonkhach_Client');
    })

    socket.on('DeliverCancelOrderGrab', async (data) => {
        const order = await OrderGrab.findById(data.orderGrabId);
        if (!order) {
            return;
        }
        fetchDriversFromDriverGrab(data, order);
    })

    socket.on('disconnect', () => {
        console.log('da ngat ket noi', socket.id);
    })
});




app.get('/', (req, res) => {
    res.status(200).send('Hello World!');
  })

// Endpoint để lấy phiên bản mới nhất
app.get('/api/version', async (req, res) => {
    Version.find().then(data =>{
        console.log('version',data);
        res.status(200).json(data[0]);

    }).catch(err=>{
        res.status(500).json({message:'loi truyen version'});
    })
});  

//Lay du lieu khu vuc
app.get('/khuvuc', async (req, res) => {
    Region.find().then(data => {
        res.status(200).json(data);
    }).catch(err => {
        res.status(500).json({ message: 'loi truyen data khuvuc' });
    })
})

//Lay du lieu parameters
app.get('/parameters', async (req, res) => {
    Parameter.find().then(data => {
        res.status(200).json(data[0]);
    }).catch(err => {
        res.status(502).json({ message: 'loi truyen parameters' });
    })
})

//lay du lieu categories
// app.get('/categories', async (req, res) => {
//     Category.find().then(data => {
//         res.status(200).json(data);
//     }).catch(err => {
//         res.status(500).json({ message: 'loi truyen categories' });
//     })
// })
//lay du lieu categories
app.get('/:khuvucId/categories', async (req, res) => {
    const id = req.params.khuvucId;
    console.log('aassddd',id);
    Region.findById(id).then(data => {
        console.log('categories',data._doc.categories);
        res.status(200).json(data._doc.categories);
    }).catch(err => {
        res.status(500).json({ message: 'loi truyen categories' });
    })
})
app.use(authRouter);
app.use(userRouter);
app.use(restaurantRouter);
app.use(orderRouter);
app.use(deliverRouter);
app.use(adminRouter);

const fetchDriversFromRestaurant = async (data, order) => {
    const orderId = data.orderId;
    const khuvucId = order.khuvuc.khuvucId;
    order.status = data.status;
    order.restaurantNote = data.restaurantNote;
    await order.save();
    let NearestDrivers = [];
    const parameters = await Parameter.find();
    const name = 'order';
    const timeRequest = parameters[0]._doc.requestDeliver;
    const vehicleId = '1';
    const feeDeliver = parameters[0]._doc.feeDeliver;
    await checkNearestDriver(data.currentRestaurantLocation, orderId, NearestDrivers, name, timeRequest, vehicleId, feeDeliver, khuvucId, socketIO);
}

const fetchDriversFromDriver = async (data, order) => {
    const orderId = data.orderId;
    const deliverId = data.deliverId;
    const restaurantLocation = data.restaurantLocation;
    const khuvucId = order.khuvuc.khuvucId;
    const parameters = await Parameter.find();
    const tempParameters = parameters[0]._doc;
    const tempStatus = { name: 'Chấp nhận', color: tempParameters.statusColors.chapNhan };
    if (order.deliveryId === deliverId) {
        order.status = tempStatus;
        order.deliveryId = '';
        await order.save();
    }
    let NearestDrivers = [];
    NearestDrivers.push({ deliverId: deliverId });
    const name = 'order';
    const timeRequest = parameters[0]._doc.requestDeliver;
    const vehicleId = '1';
    const feeDeliver = parameters[0]._doc.feeDeliver;
    await checkNearestDriver(restaurantLocation, orderId, NearestDrivers, name, timeRequest, vehicleId, feeDeliver, khuvucId, socketIO);
}

const fetchDriversFromClient = async (data) => {

    const parameters = await Parameter.find();
    const tempParameters = parameters[0]._doc;
    const clientLocation = data.clientLocation;
    const vehicleId = data.vehicleId;
    const orderGrabId = data.orderGrabId;
    const khuvucId = data.khuvuc.khuvucId;
    let NearestDrivers = [];
    const name = 'orderGrab';
    const timeRequest = tempParameters.requestDeliver;
    const feeDeliver = tempParameters.feeDeliver;
    await checkNearestDriverGrab(clientLocation, orderGrabId, NearestDrivers, name, timeRequest, vehicleId, feeDeliver, khuvucId, socketIO);
}
const fetchDriversFromDriverGrab = async (data, order) => {
    const orderId = data.orderGrabId;
    const deliverId = data.deliverId;
    const clientLocation = data.clientLocation;
    const khuvucId = order.khuvuc.khuvucId;
    const parameters = await Parameter.find();
    if (order.deliveryId === deliverId) {
        order.status = data.status;
        order.deliveryId = '';
        await order.save();
    }
    let NearestDrivers = [];
    NearestDrivers.push({ deliverId: deliverId });
    const name = 'orderGrab';
    const timeRequest = parameters[0]._doc.requestDeliver;
    const vehicleId = order.vehicleId;
    const feeDeliver = parameters[0]._doc.feeDeliver;
    await checkNearestDriverGrab(clientLocation, orderId, NearestDrivers, name, timeRequest, vehicleId, feeDeliver, khuvucId, socketIO);
}

//tu dong cap nhat socketIO
app.post('/autoUpdateSocketIO/:userId/:socketId', async (req, res) => {
    const userId = req.params.userId;
    const socketId = req.params.socketId;
    const user = await User.findById(userId);
    if (!user) {
        return res.status(500).json({ message: 'khong co Deliver' });
    }
    user.socketId = socketId;
    await user.save();
    const deliver = await Deliver.findOne({ deliverId: userId });
    if (!deliver) {
        return res.status(404).json({ message: 'khong co Deliver' });
    }
    const data = {
        khuvucId: deliver.khuvuc.khuvucId
    }
    res.status(200).json(data);
})

//load ads
app.get('/ads/:khuvucId', async (req, res) => {
    const currentDate = new Date();
    const khuvucId = req.params.khuvucId;
    const ads = await Ad.find({ 'khuvuc.khuvucId': khuvucId, isActive: true, activePeriodStart: { $lte: currentDate }, activePeriodEnd: { $gte: currentDate } });
    if (!ads) {
        return res.status(500).json({ message: 'khong co quang cao' });
    }
    res.status(200).json(ads);
})
//nha hang ad
app.get('/restaurantAd/:restaurantId', async (req, res) => {
    const restaurantId = req.params.restaurantId;
    const restaurant = await Restaurant.findOne({ restaurantId: restaurantId });
    if (!restaurant) {
        return res.status(500).json({ message: 'nha hang khong co' });
    }
    res.status(200).json(restaurant);
})