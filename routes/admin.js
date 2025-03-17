const express = require('express');
const router = express.Router();
const { login, signup } = require('../controllers/adminAuthController');
const verifyJWT = require('../middleware/verifyJWT');
const User = require('../model/User');

router.get('/dashboard', verifyJWT, async (req, res) => {
    try {
        // Fetch all users
        const users = await User.find().select('-password -refreshToken');
        res.render('dashboard', { users });
    } catch (error) {
        console.error('Error fetching users:', error);
        req.flash('error', 'Failed to load user data');
        res.render('dashboard', { users: [] });
    }
});

router.get('/verify-token', verifyJWT, (req, res) => {
    // If we get here, the token is valid
    res.status(200).json({ valid: true });
});

router.post('/login', login);
router.post('/signup', signup);

module.exports = router;