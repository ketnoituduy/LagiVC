const jwt = require('jsonwebtoken');
const User = require('../models/user');

const middlewareController = {
    authenticateToken: async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ message: 'Không tìm thấy token' });
            }

            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN);

            const user = await User.findById(decoded.userId);
            if (!user) {
                return res.status(401).json({ message: 'User không tồn tại' });
            }

            req.user = user;
            next();
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    message: 'Token đã hết hạn',
                    code: 'TOKEN_EXPIRED'
                });
            }
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({ message: 'Token không hợp lệ' });
            }
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }
}

module.exports = middlewareController;