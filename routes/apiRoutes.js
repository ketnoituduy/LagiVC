const express = require("express");

const authRouter = require("./auth");
const userRouter = require("./user");
const restaurantRouter = require("./restaurant");
const orderRouter = require("./order");
const deliverRouter = require("./deliver");
const adminRouter = require("./admin");

const router = express.Router();

// Thêm tiền tố "/v1" ở đây nếu muốn có versioning
router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/restaurants", restaurantRouter);
router.use("/orders", orderRouter);
router.use("/delivers", deliverRouter);
router.use("/admin", adminRouter);

module.exports = router;