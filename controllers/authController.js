const User = require('../model/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const handleLogin = async (req, res) => {
    const { regno, pwd } = req.body;
    
    if (!regno || !pwd) {
        req.flash('error', 'Registration number and password are required.');
        return res.redirect('signin'); // Redirect to login page
    }

    try {
        const foundUser = await User.findOne({ regno: regno }).exec();
        
        if (!foundUser) {
            req.flash('error', 'User not found');
            return res.redirect('signin');
        }

        const match = await bcrypt.compare(pwd, foundUser.password);
        
        if (!match) {
            req.flash('error', 'Invalid password');
            return res.redirect('signin');
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
        res.cookie('jwt', refreshToken, { 
            httpOnly: true, 
            secure: true, 
            sameSite: 'None', 
            maxAge: 24 * 60 * 60 * 1000 
        });

        // Send both tokens to the client
        res.json({ 
            accessToken,
            roles,
            username: foundUser.username
        });

    } catch (err) {
        req.flash('error', 'An error occurred during login');
        res.redirect('signin');
    }
}

module.exports = { handleLogin };