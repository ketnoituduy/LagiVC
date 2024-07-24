const jwt = require('jsonwebtoken');
require('dotenv').config();

const middlewareController = {
    authenticateToken : (req, res, next) => {
        const token = req.headers.authorization;
        if (!token) return res.sendStatus(401);

        jwt.verify(token.split(' ')[1], process.env.ACCESS_TOKEN, (err, user) => {
            if (err) return res.sendStatus(403);
            req.user = user;
            next();
        });
    }
}

module.exports = middlewareController;