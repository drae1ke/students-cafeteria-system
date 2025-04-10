const express = require('express');
const router = express.Router();
const Order = require('../../model/orders');
const User = require('../../model/User');
const verifyJWT = require('../../middleware/verifyJWT');

router.get('/', verifyJWT, async (req, res) => {
    try {
        // Check if user is admin
        if (!req.roles || !req.roles.includes(5150)) { // 5150 is admin role code
            return res.status(403).json({ message: 'Admin access required' });
        }
        
        // Fetch all orders with user details populated
        const orders = await Order.find()
            .populate('userId', 'username email')
            .sort({ orderDate: -1 }); // Newest first
        
        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET a single order by ID
router.get('/:id', verifyJWT, async (req, res) => {
    try {
        // Check if user is admin
        if (!req.roles || !req.roles.includes(5150)) {
            return res.status(403).json({ message: 'Admin access required' });
        }
        
        const order = await Order.findById(req.params.id)
            .populate('userId', 'username email');
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        res.json(order);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// UPDATE order status
router.put('/:id/status', verifyJWT, async (req, res) => {
    try {
        // Check if user is admin
        if (!req.roles || !req.roles.includes(5150)) {
            return res.status(403).json({ message: 'Admin access required' });
        }
        
        const { status } = req.body;
        
        if (!status) {
            return res.status(400).json({ message: 'Status is required' });
        }
        
        // Valid statuses
        const validStatuses = ['Pending', 'Processing', 'Ready', 'Completed', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }
        
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        res.json(order);
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST route to create a new order
router.post('/', verifyJWT, async (req, res) => {
    try {
        const username = req.user
        const userData = await User.findOne({ username: username });
        const userId = userData._id;
        console.log('Received order data:', req.body);
        
        // Validate the incoming data
        if (!req.body.items || !Array.isArray(req.body.items) || req.body.items.length === 0) {
            return res.status(400).json({ message: 'Order must contain items' });
        }
        
        // Calculate totalAmount on the server if not provided
        let totalAmount = req.body.totalAmount;
        if (!totalAmount) {
            console.log('totalAmount not provided, calculating on server');
            totalAmount = req.body.items.reduce((sum, item) => {
                return sum + (item.price * item.quantity);
            }, 0);
        }
        
        // Ensure each item has the required fields
        const validatedItems = req.body.items.map(item => {
            // Make sure we have at least the required fields
            if (!item.name || !item.price || !item.quantity) {
                throw new Error('Each item must have name, price, and quantity');
            }
            
            return {
                name: item.name,
                price: item.price,
                quantity: item.quantity
            };
        });
        
        // Create a new order with the validated data
        const newOrder = new Order({
            userId: userId, // Set from the JWT middleware
            items: validatedItems,
            orderDate: req.body.orderDate || new Date(),
            totalAmount: totalAmount,
            status: 'Pending'
        });
        
        console.log('Creating order object:', newOrder);
        
        // Save the order to the database
        const savedOrder = await newOrder.save();
        console.log('Order saved successfully:', savedOrder._id);
        
        // Return a response format that matches what the frontend expects
        res.status(201).json({
            success: true,
            orderId: savedOrder._id,
            order: savedOrder
        });
    } catch (error) {
        console.error('Error placing order:', error);
        
        // Provide more detailed error message
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                message: 'Validation error', 
                details: error.message 
            });
        }
        
        res.status(500).json({ message: error.message || 'Server error' });
    }
});

module.exports = router;