require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const bodyParser = require("body-parser");
const http = require("http");

const connectDB = require("./config/db");
const limiter = require("./config/rateLimit");
const apiRoutes = require("./routes/apiRoutes");
const { initializeSocket } = require("./sockets/socket");

const app = express();
const port = process.env.PORT || 4000;

const User = require('./models/user');
const Restaurant = require('./models/restaurant');
const Deliver = require('./models/deliver');
const Ad = require('./models/ad');
const Region = require('./models/region');
const Parameter = require('./models/parameter');
const Version = require('./models/version');

// Kết nối MongoDB
connectDB();

// Middleware
app.use(helmet());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(limiter);

// Routes
app.use("/api/v1", apiRoutes);

// Khởi chạy server
const server = http.createServer(app)

initializeSocket(server); // ✅ Khởi tạo socket

// ✅ Khởi động server
server.listen(port, () => {
    console.log(`🚀 Server đang chạy tại ${process.env.IP_ADDRESS || "localhost"}:${port}`);
});
// Bắt lỗi không mong muốn để tránh crash server
// process.on("uncaughtException", (error) => {
//     console.error("❌ Lỗi không mong muốn:", error);
// });

// process.on("unhandledRejection", (reason, promise) => {
//     console.error("❌ Lỗi Promise chưa xử lý:", reason);
// });

app.get('/', (req, res) => {
    res.status(200).send('Hello World!');
})
app.get('/api/v1', (req, res) => {
    res.status(200).send('Hello World!');
})

// Endpoint để lấy phiên bản mới nhất
app.get('/api/v1/api/version', async (req, res) => {
    try {
        const data = await Version.find();
        console.log('version', data);
        res.status(200).json(data[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi lấy version' });
    }
});

//Lay du lieu khu vuc
app.get('/api/v1/khuvuc', async (req, res) => {
    Region.find().then(data => {
        res.status(200).json(data);
    }).catch(err => {
        res.status(500).json({ message: 'loi truyen data khuvuc' });
    })
})

//Lay du lieu parameters
app.get('/api/v1/parameters', async (req, res) => {
    Parameter.find().then(data => {
        res.status(200).json(data[0]);
    }).catch(err => {
        res.status(502).json({ message: 'loi truyen parameters' });
    })
})

// lay categories
app.get('/api/v1/:khuvucId/categories', async (req, res) => {
    try {
        const { khuvucId } = req.params;
        if (!khuvucId) return res.status(400).json({ message: "Thiếu khuvucId" });

        const data = await Region.findById(khuvucId);
        if (!data) return res.status(404).json({ message: "Không tìm thấy khu vực" });

        res.status(200).json(data._doc.categories);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy danh mục' });
    }
});

//tu dong cap nhat socketIO
app.post('/api/v1/autoUpdateSocketIO/:userId/:socketId', async (req, res) => {
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
app.get('/api/v1/ads/:khuvucId', async (req, res) => {
    const currentDate = new Date();
    const khuvucId = req.params.khuvucId;
    const ads = await Ad.find({ 'khuvuc.khuvucId': khuvucId, isActive: true, activePeriodStart: { $lte: currentDate }, activePeriodEnd: { $gte: currentDate } });
    if (!ads) {
        return res.status(500).json({ message: 'khong co quang cao' });
    }
    res.status(200).json(ads);
})

//nha hang ad
app.get('/api/v1/restaurantAd/:restaurantId', async (req, res) => {
    try {
        const { restaurantId } = req.params;
        if (!restaurantId) return res.status(400).json({ message: "Thiếu restaurantId" });

        const restaurant = await Restaurant.findOne({ restaurantId });
        if (!restaurant) return res.status(404).json({ message: "Nhà hàng không tồn tại" });

        res.status(200).json(restaurant);
    } catch (error) {
        res.status(500).json({ message: "Lỗi lấy dữ liệu nhà hàng" });
    }
});

