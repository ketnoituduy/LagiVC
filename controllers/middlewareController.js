const jwt = require('jsonwebtoken');
require('dotenv').config();

const middlewareController = {
    authenticateToken: (req, res, next) => {
        const token = req.header('Authorization'); // Lấy token từ header

        if (!token) {
            return res.status(401).json({ message: 'Không có quyền truy cập!' });
        }

        try {
            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN); // Giải mã token
            
            // Kiểm tra thời gian hết hạn
            const currentTime = Math.floor(Date.now() / 1000);
            if (decoded.exp && decoded.exp < currentTime) {
                return res.status(401).json({ 
                    message: 'Token đã hết hạn!',
                    code: 'TOKEN_EXPIRED'
                });
            }

            req.user = decoded; // Gắn user vào request để sử dụng trong controller
            next(); // Chuyển sang middleware tiếp theo hoặc controller
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    message: 'Token đã hết hạn!',
                    code: 'TOKEN_EXPIRED'
                });
            }
            res.status(403).json({ message: 'Token không hợp lệ!' });
        }
    }
}

module.exports = middlewareController;