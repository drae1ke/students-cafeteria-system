const express = require('express');
const router = express.Router();
const usersController = require('../../controllers/usersController');
const ROLES_LIST = require('../../config/roles_list');
const verifyRoles = require('../../middleware/verifyRoles');
const verifyJWT = require('../../middleware/verifyJWT');
const User = require('../../model/User');

router.route('/')
    .get(verifyRoles(ROLES_LIST.Admin), usersController.getAllUsers)
    .delete(verifyRoles(ROLES_LIST.Admin), usersController.deleteUser);

router.route('/:id')
    .get(verifyRoles(ROLES_LIST.Admin), usersController.getUser)
    .patch(verifyRoles(ROLES_LIST.Admin), usersController.updateUser); // Add this line

router.get('/profile', verifyJWT, async (req, res) => {
    try {
        const user = await User.findOne({ username: req.user }).exec();
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Send back user data (excluding sensitive information)
        res.json({
            username: user.username,
            regno: user.regno,
            email: user.email,
            // Add other fields you want to display
            balance: user.balance || 0,
            orders: user.orders || 0,
            totalSpent: user.totalSpent || 0
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;