const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Order = require('../../model/orders');
const User = require('../../model/User');
const MenuItem = require('../../model/meal');
const verifyJWT = require('../../middleware/verifyJWT');
const {
    DEFAULT_SUBSIDY_RATE,
    buildOrderReceipt,
    buildReceiptNumber,
    roundMoney
} = require('../../utils/receipts');

const ADMIN_ROLE = 5150;
const MAX_ITEM_QUANTITY = 50;

const isAdmin = (req) => Array.isArray(req.roles) && req.roles.includes(ADMIN_ROLE);

const getStudentUser = (username, session) => {
    let query = User.findOne({ username });
    if (session) query = query.session(session);
    return query.exec();
};

const getMenuItemsById = (ids, session) => {
    let query = MenuItem.find({ _id: { $in: ids } });
    if (session) query = query.session(session);
    return query.exec();
};

const assertValidOrderItems = async (rawItems, session) => {
    if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
        const error = new Error('Order must contain items');
        error.statusCode = 400;
        throw error;
    }

    const requestedItems = rawItems.map((item) => {
        const menuItemId = String(item.menuItemId || item.itemId || item.id || item._id || '');
        const quantity = Number(item.quantity);

        if (!mongoose.Types.ObjectId.isValid(menuItemId)) {
            const error = new Error('Each order item must include a valid menu item id');
            error.statusCode = 400;
            throw error;
        }

        if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_ITEM_QUANTITY) {
            const error = new Error(`Item quantity must be between 1 and ${MAX_ITEM_QUANTITY}`);
            error.statusCode = 400;
            throw error;
        }

        return { menuItemId, quantity };
    });

    const uniqueIds = [...new Set(requestedItems.map((item) => item.menuItemId))];
    const menuItems = await getMenuItemsById(uniqueIds, session);
    const menuById = new Map(menuItems.map((item) => [String(item._id), item]));

    const validatedItems = requestedItems.map((requestedItem) => {
        const menuItem = menuById.get(requestedItem.menuItemId);

        if (!menuItem) {
            const error = new Error('One or more menu items no longer exist');
            error.statusCode = 400;
            throw error;
        }

        if (!menuItem.availability) {
            const error = new Error(`${menuItem.name} is currently unavailable`);
            error.statusCode = 400;
            throw error;
        }

        return {
            name: menuItem.name,
            quantity: requestedItem.quantity,
            price: roundMoney(menuItem.price)
        };
    });

    const subtotalAmount = roundMoney(
        validatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    );
    const subsidyAmount = roundMoney(subtotalAmount * DEFAULT_SUBSIDY_RATE);
    const totalAmount = roundMoney(subtotalAmount - subsidyAmount);

    return {
        items: validatedItems,
        subtotalAmount,
        subsidyAmount,
        totalAmount
    };
};

const getScopedOrder = async (req) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        const error = new Error('Invalid order id');
        error.statusCode = 400;
        throw error;
    }

    if (isAdmin(req)) {
        const order = await Order.findById(req.params.id).populate('userId', 'username email regno');
        return { order, user: order?.userId };
    }

    const user = await getStudentUser(req.user);
    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    const order = await Order.findOne({ _id: req.params.id, userId: user._id });
    return { order, user };
};

router.get('/', verifyJWT, async (req, res) => {
    try {
        if (req.baseUrl === '/api/orders') {
            if (!isAdmin(req)) {
                return res.status(403).json({ message: 'Admin access required' });
            }

            const orders = await Order.find()
                .populate('userId', 'username email regno')
                .sort({ orderDate: -1 });

            return res.json(orders);
        }

        const user = await getStudentUser(req.user);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const orders = await Order.find({ userId: user._id })
            .sort({ orderDate: -1 });

        return res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/:id', verifyJWT, async (req, res) => {
    try {
        const { order } = await getScopedOrder(req);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.json(order);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(error.statusCode || 500).json({ message: error.message || 'Server error' });
    }
});

router.get('/:id/receipt', verifyJWT, async (req, res) => {
    try {
        const { order, user } = await getScopedOrder(req);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.json(buildOrderReceipt(user, order));
    } catch (error) {
        console.error('Error generating order receipt:', error);
        res.status(error.statusCode || 500).json({ message: error.message || 'Failed to generate receipt' });
    }
});

router.put('/:id/status', verifyJWT, async (req, res) => {
    try {
        if (!isAdmin(req)) {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const { status } = req.body;
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

router.post('/', verifyJWT, async (req, res) => {
    let session;

    try {
        session = await mongoose.startSession();
        let savedOrder;
        let receipt;

        await session.withTransaction(async () => {
            const user = await getStudentUser(req.user, session);
            if (!user) {
                const error = new Error('User not found');
                error.statusCode = 404;
                throw error;
            }

            const totals = await assertValidOrderItems(req.body.items, session);

            if (roundMoney(user.balance) < totals.totalAmount) {
                const error = new Error('Insufficient e-wallet balance. Please deposit funds before placing this order.');
                error.statusCode = 402;
                error.details = {
                    balance: roundMoney(user.balance),
                    required: totals.totalAmount
                };
                throw error;
            }

            const balanceBefore = roundMoney(user.balance);
            const balanceAfter = roundMoney(balanceBefore - totals.totalAmount);
            const paidAt = new Date();

            const order = new Order({
                userId: user._id,
                items: totals.items,
                orderDate: paidAt,
                subtotalAmount: totals.subtotalAmount,
                subsidyAmount: totals.subsidyAmount,
                totalAmount: totals.totalAmount,
                status: 'Pending',
                paymentStatus: 'paid',
                balanceBefore,
                balanceAfter,
                paidAt
            });

            order.receiptNumber = buildReceiptNumber('ORD', order._id);
            order.paymentReference = buildReceiptNumber('PAY', order._id);

            user.balance = balanceAfter;
            user.transactions.push({
                type: 'payment',
                amount: totals.totalAmount,
                status: 'completed',
                reference: order.paymentReference,
                receiptNumber: order.receiptNumber,
                orderId: order._id,
                description: `Cafeteria order ${order.receiptNumber}`,
                balanceBefore,
                balanceAfter,
                completedAt: paidAt,
                timestamp: paidAt
            });

            await order.save({ session });
            await user.save({ session });

            savedOrder = order;
            receipt = buildOrderReceipt(user, order);
        });

        res.status(201).json({
            success: true,
            orderId: savedOrder._id,
            receiptNumber: savedOrder.receiptNumber,
            paymentReference: savedOrder.paymentReference,
            order: savedOrder,
            receipt
        });
    } catch (error) {
        console.error('Error placing order:', error);

        if (error.statusCode) {
            return res.status(error.statusCode).json({
                message: error.message,
                details: error.details
            });
        }

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                message: 'Validation error',
                details: error.message
            });
        }

        res.status(500).json({ message: error.message || 'Server error' });
    } finally {
        if (session) {
            await session.endSession();
        }
    }
});

module.exports = router;
