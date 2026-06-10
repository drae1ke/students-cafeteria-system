const express = require('express');
const Order = require('../../model/orders');
const User = require('../../model/User');
const verifyRoles = require('../../middleware/verifyRoles');
const ROLES_LIST = require('../../config/roles_list');
const { roundMoney } = require('../../utils/receipts');

const router = express.Router();
const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date, days) => new Date(date.getTime() + (days * DAY_MS));
const dateKey = (date) => startOfDay(date).toISOString().slice(0, 10);
const monthKey = (date) => `${date.getFullYear()}-${date.getMonth()}`;

const currencyTotal = (aggregationResult) => roundMoney(aggregationResult[0]?.total || 0);

const buildBuckets = (range) => {
    const now = new Date();

    if (range === 'quarter') {
        const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        const buckets = [0, 1, 2].map((offset) => {
            const bucketDate = new Date(start.getFullYear(), start.getMonth() + offset, 1);
            return {
                key: monthKey(bucketDate),
                label: bucketDate.toLocaleDateString('en-US', { month: 'short' })
            };
        });

        return {
            start,
            buckets,
            getKey: (date) => monthKey(date)
        };
    }

    if (range === 'month') {
        const start = addDays(startOfDay(now), -27);
        const buckets = [0, 1, 2, 3].map((offset) => {
            const bucketStart = addDays(start, offset * 7);
            return {
                key: `week-${offset}`,
                label: `${bucketStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            };
        });

        return {
            start,
            buckets,
            getKey: (date) => {
                const diffDays = Math.floor((startOfDay(date) - start) / DAY_MS);
                const index = Math.max(0, Math.min(3, Math.floor(diffDays / 7)));
                return `week-${index}`;
            }
        };
    }

    const start = addDays(startOfDay(now), -6);
    const buckets = Array.from({ length: 7 }, (_, index) => {
        const bucketDate = addDays(start, index);
        return {
            key: dateKey(bucketDate),
            label: bucketDate.toLocaleDateString('en-US', { weekday: 'short' })
        };
    });

    return {
        start,
        buckets,
        getKey: (date) => dateKey(date)
    };
};

router.get('/', verifyRoles(ROLES_LIST.Admin), async (req, res) => {
    try {
        const range = ['week', 'month', 'quarter'].includes(req.query.range) ? req.query.range : 'week';
        const now = new Date();
        const todayStart = startOfDay(now);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const { start, buckets, getKey } = buildBuckets(range);

        const [orders, totalUsers, todaySales, monthlySales, walletBalances, walletDeposits] = await Promise.all([
            Order.find({
                paymentStatus: 'paid',
                orderDate: { $gte: start, $lte: now }
            }).select('totalAmount userId orderDate').lean(),
            User.countDocuments(),
            Order.aggregate([
                { $match: { paymentStatus: 'paid', orderDate: { $gte: todayStart, $lte: now } } },
                { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
            ]),
            Order.aggregate([
                { $match: { paymentStatus: 'paid', orderDate: { $gte: monthStart, $lte: now } } },
                { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
            ]),
            User.aggregate([
                { $group: { _id: null, total: { $sum: '$balance' } } }
            ]),
            User.aggregate([
                { $unwind: '$transactions' },
                { $match: { 'transactions.type': 'deposit', 'transactions.status': 'completed' } },
                { $group: { _id: null, total: { $sum: '$transactions.amount' }, count: { $sum: 1 } } }
            ])
        ]);

        const bucketData = new Map(buckets.map((bucket) => [
            bucket.key,
            { sales: 0, users: new Set() }
        ]));

        orders.forEach((order) => {
            const key = getKey(new Date(order.orderDate));
            const bucket = bucketData.get(key);
            if (!bucket) return;

            bucket.sales += Number(order.totalAmount) || 0;
            if (order.userId) bucket.users.add(String(order.userId));
        });

        const salesData = buckets.map((bucket) => roundMoney(bucketData.get(bucket.key).sales));
        const customerData = buckets.map((bucket) => bucketData.get(bucket.key).users.size);
        const activeDayCount = range === 'week' ? 7 : range === 'month' ? 28 : 90;

        res.json({
            range,
            labels: buckets.map((bucket) => bucket.label),
            salesData,
            customerData,
            summary: {
                totalUsers,
                todaySales: currencyTotal(todaySales),
                monthlySales: currencyTotal(monthlySales),
                averageDailyUsers: roundMoney(customerData.reduce((sum, value) => sum + value, 0) / activeDayCount),
                paidOrders: orders.length,
                walletBalance: currencyTotal(walletBalances),
                totalDeposited: currencyTotal(walletDeposits)
            }
        });
    } catch (error) {
        console.error('Error building analytics:', error);
        res.status(500).json({ message: 'Failed to load analytics' });
    }
});

module.exports = router;
