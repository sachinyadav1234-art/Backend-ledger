const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");
const tokenBlackListModel = require("../models/blackList.model");

async function authMiddleware(req, res, next) {
    try {
        const token = req.cookies?.token || req.headers.authorization?.split(" ")[ 1 ];

        if (!token) {
            return res.status(401).json({
                message: "Unauthorized: No token provided"
            });
        }

        // Check if token is blacklisted
        const isBlacklisted = await tokenBlackListModel.findOne({ token });
        if (isBlacklisted) {
            return res.status(401).json({
                message: "Unauthorized: Token is blacklisted"
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userModel.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({
                message: "Unauthorized: User not found"
            });
        }

        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({
            message: "Unauthorized: Invalid or expired token"
        });
    }
}

async function authSystemUserMiddleware(req, res, next) {
    try {
        const token = req.cookies?.token || req.headers.authorization?.split(" ")[ 1 ];

        if (!token) {
            return res.status(401).json({
                message: "Unauthorized: No token provided"
            });
        }

        // Check if token is blacklisted
        const isBlacklisted = await tokenBlackListModel.findOne({ token });
        if (isBlacklisted) {
            return res.status(401).json({
                message: "Unauthorized: Token is blacklisted"
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userModel.findById(decoded.userId).select("+systemUser");

        if (!user) {
            return res.status(401).json({
                message: "Unauthorized: User not found"
            });
        }

        if (!user.systemUser) {
            return res.status(403).json({
                message: "Forbidden: Access restricted to system users only"
            });
        }

        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({
            message: "Unauthorized: Invalid or expired token"
        });
    }
}

module.exports = {
    authMiddleware,
    authSystemUserMiddleware
};