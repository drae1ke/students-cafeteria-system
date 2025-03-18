const express = require('express');
const router = express.Router();
const User = require('../model/User');

// Route to render profile page
router.get('/', (req, res) => {
    res.render('profile');
});

// Route to get user profile data
router.get('/data', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.user }).exec();
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Send only necessary user data
        res.json({
            username: user.username,
            regno: user.regno,
            email: user.email,
            // Add other fields you want to display
            balance: 0, // You can add these fields to your user model
            orders: 0,
            totalSpent: 0
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;