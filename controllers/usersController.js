const User = require('../model/User');

const getAllUsers = async (req, res) => {
    const users = await User.find();
    if (!users) return res.status(204).json({ 'message': 'No users found' });
    res.json(users);
}

const deleteUser = async (req, res) => {
    if (!req?.body?.id) return res.status(400).json({ "message": 'User ID required' });
    const user = await User.findOne({ _id: req.body.id }).exec();
    if (!user) {
        return res.status(204).json({ 'message': `User ID ${req.body.id} not found` });
    }
    const result = await user.deleteOne({ _id: req.body.id });
    res.json(result);
}

const getUser = async (req, res) => {
    if (!req?.params?.id) return res.status(400).json({ "message": 'User ID required' });
    const user = await User.findOne({ _id: req.params.id }).exec();
    if (!user) {
        return res.status(204).json({ 'message': `User ID ${req.params.id} not found` });
    }
    res.json(user);
}

// New update function
const updateUser = async (req, res) => {
    if (!req?.params?.id) {
        return res.status(400).json({ "message": 'User ID required' });
    }

    try {
        const user = await User.findOne({ _id: req.params.id }).exec();
        if (!user) {
            return res.status(204).json({ 'message': `User ID ${req.params.id} not found` });
        }

        // Update user fields if provided
        if (req.body.username) user.username = req.body.username;
        if (req.body.email) user.email = req.body.email;
        if (req.body.regno) user.regno = req.body.regno;
        
        // Update roles if provided
        if (req.body.roles) {
            user.roles = req.body.roles;
        }

        const result = await user.save();
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ 'message': 'Server error during update' });
    }
}

module.exports = {
    getAllUsers,
    deleteUser,
    getUser,
    updateUser
}