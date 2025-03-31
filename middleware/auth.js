const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Car_Provider = require('../models/Car_Provider');
const ValidToken = require('../models/ValidToken');

// Protect routes
exports.protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
    }

    try {
        const validToken = await ValidToken.findOne({ token });
        if (!validToken) {
            return res.status(401).json({ success: false, message: 'Token has been invalidated' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if the token is for a user or a provider
        if (decoded.type === 'provider') {
            req.provider = await Car_Provider.findById(decoded.id);
            if (!req.provider) {
                return res.status(401).json({ success: false, message: 'Provider not found' });
            }
        } else {
            req.user = await User.findById(decoded.id);
            if (!req.user) {
                return res.status(401).json({ success: false, message: 'User not found' });
            }
        }
        
        next();
    } catch (err) {
        console.log(err.stack);
        return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
    }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
    return (req, res, next) => {
        // Check if we're dealing with a provider
        if (req.provider) {
            if (roles.includes('provider')) {
                return next();
            }
            return res.status(403).json({
                success: false,
                message: 'Provider is not authorized to access this route'
            });
        }
        
        // Check if we're dealing with a user
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'User role is not authorized to access this route'
            });
        }
        
        next();
    };
};