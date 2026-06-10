const User = require('../model/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { refreshCookieOptions } = require('../utils/cookieOptions');

const handleLogin = async (req, res) => {
    const { regno, pwd } = req.body;
    
    if (!regno || !pwd) {
        return res.status(400).json({ message: 'Registration number and password are required.' });
    }

    try {
        const foundUser = await User.findOne({ regno: regno.trim() }).exec();
        
        if (!foundUser) {
            return res.status(401).json({ message: 'Invalid registration number or password.' });
        }

        const match = await bcrypt.compare(pwd, foundUser.password);
        
        if (!match) {
            return res.status(401).json({ message: 'Invalid registration number or password.' });
        }

        // Successful login logic
        const roles = Object.values(foundUser.roles).filter(Boolean);
        
        const accessToken = jwt.sign(
            { "UserInfo": { "username": foundUser.username, "roles": roles } },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '3600s' }
        );

        const refreshToken = jwt.sign(
            { "username": foundUser.username },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: '1d' }
        );

        foundUser.refreshToken = refreshToken;
        await foundUser.save();

        // Store the access token in localStorage after successful login
        res.cookie('jwt', refreshToken, refreshCookieOptions);

        // Send both tokens to the client
        res.json({ 
            accessToken,
            roles,
            username: foundUser.username
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'An error occurred during login.' });
    }
}

module.exports = { handleLogin };
