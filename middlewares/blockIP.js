const IPModel = require("../models/IPModel");
const BlockedIP = require("../models/BlockedIP");

const blockIPMiddleware = async (req, res, next) => {
    try {
        // Lấy IP từ header 'x-forwarded-for' hoặc từ socket
        let clientIP = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
        
        // Nếu có nhiều IP (do proxy), lấy IP đầu tiên
        if (clientIP.includes(',')) {
            clientIP = clientIP.split(',')[0].trim();
        }

        console.log('📌 Client IP:', clientIP); // Debug kiểm tra IP

        // Kiểm tra xem IP có bị chặn không
        const blocked = await BlockedIP.findOne({ ip: clientIP });
        if (blocked) {
            return res.status(403).json({ message: '🚫 Truy cập bị từ chối - IP bị chặn' });
        }

        // Lưu IP public vào IPModel nếu chưa tồn tại
        const existingIP = await IPModel.findOne({ ip: clientIP });
        if (!existingIP) {
            await IPModel.create({ ip: clientIP });
            console.log('✅ IP đã lưu vào MongoDB:', clientIP);
        }

        next(); // Cho phép request tiếp tục nếu không bị chặn
    } catch (error) {
        console.error('❌ Lỗi kiểm tra hoặc lưu IP:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

module.exports = blockIPMiddleware;