const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 phút
    max: 150, // Tối đa 150 request
    message: "❌ Bạn đã gửi quá nhiều yêu cầu, hãy thử lại sau!"
});

module.exports = limiter;