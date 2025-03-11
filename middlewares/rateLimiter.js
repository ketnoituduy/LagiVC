const rateLimit = require("express-rate-limit");

const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phút
    max: 5, // Tối đa 5 lần đăng ký trong 15 phút
    message: { error: "Bạn đã thực hiện quá nhiều lần đăng ký, vui lòng thử lại sau." },
});

const loginLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 phút
    max: 10, // Tối đa 10 lần đăng nhập trong 10 phút
    message: { error: "Bạn đã nhập sai quá nhiều lần, vui lòng thử lại sau." },
});

module.exports = { registerLimiter, loginLimiter };