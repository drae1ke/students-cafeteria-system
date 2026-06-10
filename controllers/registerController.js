const User = require('../model/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { refreshCookieOptions } = require('../utils/cookieOptions');

const handleNewUser = async (req, res) => {
    const { user, pwd, email, regno } = req.body;
    if (!user || !pwd || !email || !regno) {
        return res.status(400).json({ message: 'Username, email, registration number, and password are required.' });
    }

    const username = user.trim();
    const userEmail = email.trim().toLowerCase();
    const registrationNumber = regno.trim();

    // check for duplicate users in the db
    const duplicate = await User.findOne({
        $or: [
            { username },
            { email: userEmail },
            { regno: registrationNumber }
        ]
    }).exec();
    if (duplicate) {
        return res.status(409).json({ message: 'User already exists.' });

    }

    try {
        //encrypt the password
        const hashedPwd = await bcrypt.hash(pwd, 10);

        //create and store the new user
        const result = await User.create({
            username,
            password: hashedPwd,
            email: userEmail,
            regno: registrationNumber
        });

        const roles = Object.values(result.roles).filter(Boolean);
        const accessToken = jwt.sign(
            { UserInfo: { username: result.username, roles } },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '1h' }
        );

        const refreshToken = jwt.sign(
            { username: result.username },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: '1d' }
        );

        result.refreshToken = refreshToken;
        await result.save();

        res.cookie('jwt', refreshToken, refreshCookieOptions);

        res.status(201).json({
            success: `New user ${username} created!`,
            accessToken,
            roles,
            username: result.username
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

module.exports = { handleNewUser };
