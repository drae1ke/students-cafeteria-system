const jwt = require('jsonwebtoken');

const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    
    if (!authHeader) {
        return res.status(401).json({ 
            message: 'No authorization header provided',
            error: 'AUTH_HEADER_MISSING'
        });
    }
    
    if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
            message: 'Invalid authorization format. Bearer token required',
            error: 'INVALID_AUTH_FORMAT'
        });
    }

    const token = authHeader.split(' ')[1];
    
    jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET,
        (err, decoded) => {
            if (err) {
                if (err.name === 'TokenExpiredError') {
                    return res.status(401).json({ 
                        message: 'Token has expired',
                        error: 'TOKEN_EXPIRED'
                    });
                }
                if (err.name === 'JsonWebTokenError') {
                    return res.status(401).json({ 
                        message: 'Invalid token',
                        error: 'INVALID_TOKEN'
                    });
                }
                return res.status(403).json({ 
                    message: 'Forbidden',
                    error: 'FORBIDDEN'
                });
            }
            
            if (!decoded.UserInfo || !decoded.UserInfo.username) {
                return res.status(401).json({ 
                    message: 'Invalid token payload',
                    error: 'INVALID_TOKEN_PAYLOAD'
                });
            }

            req.user = decoded.UserInfo.username;
            req.roles = decoded.UserInfo.roles;
            next();
        }
    );
};

module.exports = verifyJWT;