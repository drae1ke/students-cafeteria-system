const DEFAULT_SUBSIDY_RATE = 0.1;

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

const buildReceiptNumber = (prefix, id) => {
    const source = id ? String(id).replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase() : Date.now();
    return `${prefix}-${source}`;
};

const getOrderTotals = (order) => {
    const subtotal = roundMoney(
        order.subtotalAmount ??
        order.items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0)
    );
    const subsidy = roundMoney(order.subsidyAmount ?? subtotal * DEFAULT_SUBSIDY_RATE);
    const total = roundMoney(order.totalAmount ?? subtotal - subsidy);

    return { subtotal, subsidy, total };
};

const buildWalletReceipt = (user, transaction) => ({
    receiptType: 'wallet_deposit',
    receiptNumber: transaction.mpesaReceiptNumber || transaction.reference,
    generatedAt: new Date(),
    customer: {
        username: user.username,
        regno: user.regno,
        email: user.email,
        phone: transaction.phone || user.phone
    },
    transaction: {
        reference: transaction.reference,
        mpesaReceiptNumber: transaction.mpesaReceiptNumber,
        merchantRequestId: transaction.merchantRequestId,
        checkoutRequestId: transaction.checkoutRequestId,
        amount: roundMoney(transaction.amount),
        status: transaction.status,
        resultCode: transaction.resultCode,
        resultDesc: transaction.resultDesc,
        failureReason: transaction.failureReason,
        paidAt: transaction.completedAt || transaction.timestamp,
        requestedAt: transaction.timestamp
    },
    wallet: {
        balanceBefore: roundMoney(transaction.balanceBefore),
        balanceAfter: roundMoney(transaction.balanceAfter)
    }
});

const buildOrderReceipt = (user, order) => {
    const totals = getOrderTotals(order);

    return {
        receiptType: 'order',
        receiptNumber: order.receiptNumber || buildReceiptNumber('ORD', order._id),
        generatedAt: new Date(),
        customer: {
            username: user.username,
            regno: user.regno,
            email: user.email
        },
        order: {
            id: order._id,
            orderDate: order.orderDate,
            status: order.status,
            paymentStatus: order.paymentStatus,
            paymentReference: order.paymentReference,
            items: order.items.map((item) => ({
                name: item.name,
                quantity: item.quantity,
                unitPrice: roundMoney(item.price),
                lineTotal: roundMoney(item.price * item.quantity)
            })),
            totals
        }
    };
};

module.exports = {
    DEFAULT_SUBSIDY_RATE,
    buildOrderReceipt,
    buildReceiptNumber,
    buildWalletReceipt,
    getOrderTotals,
    roundMoney
};
