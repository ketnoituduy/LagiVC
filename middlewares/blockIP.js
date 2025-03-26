const IPModel = require("../models/IPModel");
const BlockedIP = require("../models/BlockedIP");

const blockIPMiddleware = async (req, res, next) => {
    try {
        let clientIP = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
        if (clientIP.includes(',')) {
            clientIP = clientIP.split(',')[0].trim();
        }

        console.log('📌 Client IP:', clientIP);

        // Kiểm tra xem IP có bị chặn không
        const blocked = await BlockedIP.findOne({ ip: clientIP });
        if (blocked) {
            return res.status(403).json({ message: '🚫 Truy cập bị từ chối - IP bị chặn' });
        }

        // Tìm IP, nếu có thì tăng requestCount, nếu không thì tạo mới
        const ipData = await IPModel.findOneAndUpdate(
            { ip: clientIP }, 
            { 
                $inc: { requestCount: 1 }, // Tăng requestCount thêm 1
                $setOnInsert: { expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) } // Nếu là insert, set TTL
            }, 
            { upsert: true, new: true }
        );

        console.log(`✅ IP ${clientIP} đã được ghi nhận, số lần request: ${ipData.requestCount}`);

        next();
    } catch (error) {
        console.error('❌ Lỗi kiểm tra hoặc lưu IP:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

module.exports = blockIPMiddleware;