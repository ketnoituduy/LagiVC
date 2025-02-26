const socketIO = require("socket.io");

const User = require('../models/user');
const Order = require('../models/order');
const Deliver = require('../models/deliver');
const Parameter = require('../models/parameter');
const OrderGrab = require('../models/orderGrab');

const rate_Limit = {};
const MAX_REQUESTS = 10;
const TIME_WINDOW = 5000;

let io; // Biến toàn cục để lưu trữ io instance

const isSpamming = (socket) => {
    if (!rate_Limit[socket.id]) {
        rate_Limit[socket.id] = { count: 0, lastRequest: Date.now() };
    }

    let now = Date.now();
    let elapsed = now - rate_Limit[socket.id].lastRequest;

    if (elapsed < TIME_WINDOW) {
        rate_Limit[socket.id].count++;
        if (rate_Limit[socket.id].count > MAX_REQUESTS) {
            console.log(`⚠️ User ${socket.id} bị chặn do spam!`);
            socket.emit("Server_RateLimit", { message: "Bạn đã gửi quá nhiều yêu cầu, hãy thử lại sau!" });
            return true;
        }
    } else {
        rate_Limit[socket.id].count = 1;
        rate_Limit[socket.id].lastRequest = now;
    }

    return false;
};


const initializeSocket = (server) => {
    io = socketIO(server, {
        cors: {
            origin: "http://192.168.1.6:4000",
            methods: ["GET", "POST"]
        }
    });

    io.on("connection", (socket) => {
        console.log("A user connected", socket.id);
        rate_Limit[socket.id] = { count: 0, lastRequest: Date.now() };

        socket.on("AutoUpdateSocketIO", (data) => {
            if (isSpamming(socket)) return;
            socket.join(data.khuvucId);
        });

        socket.on("newOrder", async (data) => {
            if (isSpamming(socket)) return;

            const user = await User.findById(data.restaurantId);
            if (!user) return;

            const socketId = user.socketId;
            io.to(socketId).emit("Server_NewOrder", { socketId });
            socket.emit("Server_NewOrder");
        });

        socket.on("RestaurantSendOrderToDelivers", async (data) => {
            if (isSpamming(socket)) return;

            const order = await Order.findById(data.orderId);
            if (!order) return;

            fetchDriversFromRestaurant(data, order);
        });

        socket.on("RestaurantCancelOrder", (data) => {
            if (isSpamming(socket)) return;

            const { clientId, restaurantId } = data;
            io.emit("Server_RestaurantCancelOrder", { clientId, restaurantId });
        });

        socket.on("ClientDeleteOrder", async (data) => {
            if (isSpamming(socket)) return;

            const user = await User.findById(data.restaurantId);
            if (!user) return;

            const socketId = user.socketId;
            io.to(socketId).emit("Server_ClientDeleteOrder");
            socket.emit("Server_ClientDeleteOrder");
        });

        socket.on("DeliverDanggiaoOrder", async (data) => {
            if (isSpamming(socket)) return;

            const userRestaurant = await User.findById(data.restaurantId);
            const userClient = await User.findById(data.clientId);
            if (!userRestaurant || !userClient) return;

            const restaurantSocketId = userRestaurant.socketId;
            const clientSocketId = userClient.socketId;

            io.to(restaurantSocketId).emit("Server_RestaurantListenDanggiao");
            io.to(clientSocketId).emit("Server_ClientListenDanggiao");
            io.emit("Server_DeliverDanggiaoOrder", data);
        });

        socket.on("DeliveredOrder", async (data) => {
            if (isSpamming(socket)) return;

            const restaurant = await User.findById(data.restaurantId);
            const client = await User.findById(data.clientId);
            if (!restaurant || !client) return;

            const restaurantSocketId = restaurant.socketId;
            const clientId = client.socketId;

            socket.emit("Server_DeliveredOrder");
            io.to(restaurantSocketId).emit("Server_DeliveredOrder");
            io.to(clientId).emit("Server_DeliveredOrder");
        });

        socket.on("ClientSendOrderGrabToDelivers", async (data) => {
            if (isSpamming(socket)) return;

            const orderGrab = await OrderGrab.findById(data.orderGrabId);
            if (!orderGrab) return;

            fetchDriversFromClient(data);
        });

        socket.on("ClientDeleteOrderGrab", async (data) => {
            if (isSpamming(socket)) return;

            if (data.deliverId !== "") {
                const user = await User.findById(data.deliverId);
                if (!user) return;

                const socketId = user.socketId;
                io.to(socketId).emit("Server_ClientDeleteOrderGrab_Driver", { vehicleId: data.vehicleId });
            } else {
                io.to(data.khuvucId).emit("Server_ClientDeleteOrderGrab_Driver", { vehicleId: data.vehicleId });
            }

            socket.emit("Server_ClientDeleteOrderGrab_Client", { vehicleId: data.vehicleId });
        });

        socket.on("DeliverDangdonkhach", async (data) => {
            if (isSpamming(socket)) return;

            const client = await User.findById(data.clientId);
            if (!client) return;

            const socketId = client.socketId;
            const khuvucId = data.khuvucId;

            if (data.deliverId !== "") {
                socket.emit("Server_DeliverDangdonkhach_Driver", { vehicleId: data.vehicleId });
            } else {
                io.to(khuvucId).emit("Server_DeliverDangdonkhach_Driver", { vehicleId: data.vehicleId });
            }

            io.to(socketId).emit("Server_DeliverDangdonkhach_Client");
        });

        socket.on("DeliverCancelOrderGrab", async (data) => {
            if (isSpamming(socket)) return;

            const order = await OrderGrab.findById(data.orderGrabId);
            if (!order) return;

            fetchDriversFromDriverGrab(data, order);
        });

        socket.on("disconnect", () => {
            console.log("⚡ Đã ngắt kết nối", socket.id);
            delete rate_Limit[socket.id]; // Xóa dữ liệu khi user rời đi
        });
    });
};


const checkNearestDriver = require('../utils/checkNearestDriver');
const checkNearestDriverGrab = require('../utils/checkNearestDriverGrab');
const { ieNoOpen } = require("helmet");

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
    await checkNearestDriver(data.currentRestaurantLocation, orderId, NearestDrivers, name, timeRequest, vehicleId, feeDeliver, khuvucId, io);
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
    await checkNearestDriverGrab(clientLocation, orderGrabId, NearestDrivers, name, timeRequest, vehicleId, feeDeliver, khuvucId, io);
}

const fetchDriversFromDriverGrab = async (data, order) => {
    const orderId = data.orderGrabId;
    const deliverId = data.deliverId;
    const deliver = await Deliver.findOne({ deliverId: deliverId });
    deliver.status = 1;
    await deliver.save();
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
    await checkNearestDriverGrab(clientLocation, orderId, NearestDrivers, name, timeRequest, vehicleId, feeDeliver, khuvucId, io);
}

module.exports = { initializeSocket };
// const socketIO = require("socket.io");

// const User = require('../models/user');
// const Order = require('../models/order');
// const OrderGrab = require('../models/orderGrab');

// const rate_Limit = {};

// const MAX_REQUESTS = 10; // Giới hạn tối đa 10 request
// const TIME_WINDOW = 5000; // Trong 5 giây


// socketIO.on("connection", (socket) => {
//     console.log("A user connected", socket.id);

//     rate_Limit[socket.id] = { count: 0, lastRequest: Date.now() };

//     const isSpamming = (socket) => {
//         if (!rate_Limit[socket.id]) {
//             rate_Limit[socket.id] = { count: 0, lastRequest: Date.now() };
//         }

//         let now = Date.now();
//         let elapsed = now - rate_Limit[socket.id].lastRequest;

//         if (elapsed < TIME_WINDOW) {
//             rate_Limit[socket.id].count++;
//             if (rate_Limit[socket.id].count > MAX_REQUESTS) {
//                 console.log(`⚠️ User ${socket.id} bị chặn do spam!`);
//                 socket.emit("Server_RateLimit", { message: "Bạn đã gửi quá nhiều yêu cầu, hãy thử lại sau!" });
//                 return true;
//             }
//         } else {
//             rate_Limit[socket.id].count = 1;
//             rate_Limit[socket.id].lastRequest = now;
//         }

//         return false;
//     };

//     socket.on("AutoUpdateSocketIO", (data) => {
//         if (isSpamming(socket)) return;
//         socket.join(data.khuvucId);
//     });

//     socket.on("newOrder", async (data) => {
//         if (isSpamming(socket)) return;

//         const user = await User.findById(data.restaurantId);
//         if (!user) return;

//         const socketId = user.socketId;
//         socketIO.to(socketId).emit("Server_NewOrder", { socketId });
//         socket.emit("Server_NewOrder");
//     });

//     socket.on("RestaurantSendOrderToDelivers", async (data) => {
//         if (isSpamming(socket)) return;

//         const order = await Order.findById(data.orderId);
//         if (!order) return;

//         fetchDriversFromRestaurant(data, order);
//     });

//     socket.on("RestaurantCancelOrder", (data) => {
//         if (isSpamming(socket)) return;

//         const { clientId, restaurantId } = data;
//         socketIO.emit("Server_RestaurantCancelOrder", { clientId, restaurantId });
//     });

//     socket.on("ClientDeleteOrder", async (data) => {
//         if (isSpamming(socket)) return;

//         const user = await User.findById(data.restaurantId);
//         if (!user) return;

//         const socketId = user.socketId;
//         socketIO.to(socketId).emit("Server_ClientDeleteOrder");
//         socket.emit("Server_ClientDeleteOrder");
//     });

//     socket.on("DeliverDanggiaoOrder", async (data) => {
//         if (isSpamming(socket)) return;

//         const userRestaurant = await User.findById(data.restaurantId);
//         const userClient = await User.findById(data.clientId);
//         if (!userRestaurant || !userClient) return;

//         const restaurantSocketId = userRestaurant.socketId;
//         const clientSocketId = userClient.socketId;

//         socketIO.to(restaurantSocketId).emit("Server_RestaurantListenDanggiao");
//         socketIO.to(clientSocketId).emit("Server_ClientListenDanggiao");
//         socketIO.emit("Server_DeliverDanggiaoOrder", data);
//     });

//     socket.on("DeliveredOrder", async (data) => {
//         if (isSpamming(socket)) return;

//         const restaurant = await User.findById(data.restaurantId);
//         const client = await User.findById(data.clientId);
//         if (!restaurant || !client) return;

//         const restaurantSocketId = restaurant.socketId;
//         const clientId = client.socketId;

//         socket.emit("Server_DeliveredOrder");
//         socketIO.to(restaurantSocketId).emit("Server_DeliveredOrder");
//         socketIO.to(clientId).emit("Server_DeliveredOrder");
//     });

//     socket.on("ClientSendOrderGrabToDelivers", async (data) => {
//         if (isSpamming(socket)) return;

//         const orderGrab = await OrderGrab.findById(data.orderGrabId);
//         if (!orderGrab) return;

//         fetchDriversFromClient(data);
//     });

//     socket.on("ClientDeleteOrderGrab", async (data) => {
//         if (isSpamming(socket)) return;

//         if (data.deliverId !== "") {
//             const user = await User.findById(data.deliverId);
//             if (!user) return;

//             const socketId = user.socketId;
//             socketIO.to(socketId).emit("Server_ClientDeleteOrderGrab_Driver", { vehicleId: data.vehicleId });
//         } else {
//             socketIO.to(data.khuvucId).emit("Server_ClientDeleteOrderGrab_Driver", { vehicleId: data.vehicleId });
//         }

//         socket.emit("Server_ClientDeleteOrderGrab_Client", { vehicleId: data.vehicleId });
//     });

//     socket.on("DeliverDangdonkhach", async (data) => {
//         if (isSpamming(socket)) return;

//         const client = await User.findById(data.clientId);
//         if (!client) return;

//         const socketId = client.socketId;
//         const khuvucId = data.khuvucId;

//         if (data.deliverId !== "") {
//             socket.emit("Server_DeliverDangdonkhach_Driver", { vehicleId: data.vehicleId });
//         } else {
//             socketIO.to(khuvucId).emit("Server_DeliverDangdonkhach_Driver", { vehicleId: data.vehicleId });
//         }

//         socketIO.to(socketId).emit("Server_DeliverDangdonkhach_Client");
//     });

//     socket.on("DeliverCancelOrderGrab", async (data) => {
//         if (isSpamming(socket)) return;

//         const order = await OrderGrab.findById(data.orderGrabId);
//         if (!order) return;

//         fetchDriversFromDriverGrab(data, order);
//     });

//     socket.on("disconnect", () => {
//         console.log("⚡ Đã ngắt kết nối", socket.id);
//         delete rate_Limit[socket.id]; // Xóa dữ liệu khi user rời đi
//     });
// });