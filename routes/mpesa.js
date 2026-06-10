const express = require('express');
const axios = require('axios');
const moment = require('moment');
const User = require('../model/User');
const verifyJWT = require('../middleware/verifyJWT');
const { buildWalletReceipt, roundMoney } = require('../utils/receipts');

const router = express.Router();

const TOKEN_REFRESH_BUFFER_MS = 60 * 1000;
const tokenCache = {
    accessToken: null,
    expiresAt: 0
};

const getMpesaBaseUrl = () => (process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke').replace(/\/$/, '');

const getMpesaCallbackUrl = () => {
    if (process.env.MPESA_CALLBACK_URL) return process.env.MPESA_CALLBACK_URL;
    if (process.env.CALLBACK_URL) return `${process.env.CALLBACK_URL.replace(/\/$/, '')}/mpesa/callback`;
    return null;
};

const validateMpesaConfig = () => {
    const required = [
        'MPESA_CONSUMER_KEY',
        'MPESA_CONSUMER_SECRET',
        'MPESA_SHORTCODE',
        'MPESA_PASSKEY'
    ];
    const missing = required.filter((key) => !process.env[key]);
    if (!getMpesaCallbackUrl()) missing.push('MPESA_CALLBACK_URL');

    if (missing.length) {
        const error = new Error(`Missing M-Pesa configuration: ${missing.join(', ')}`);
        error.statusCode = 500;
        throw error;
    }
};

const normalizePhone = (phone) => {
    const digits = String(phone || '').replace(/\D/g, '');

    let normalized = digits;
    if (/^0(7|1)\d{8}$/.test(digits)) {
        normalized = `254${digits.slice(1)}`;
    } else if (/^(7|1)\d{8}$/.test(digits)) {
        normalized = `254${digits}`;
    }

    if (!/^254(7|1)\d{8}$/.test(normalized)) {
        return null;
    }

    return normalized;
};

const parseAmount = (amount) => {
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 10 || parsedAmount > 100000) {
        return null;
    }

    return Math.round(parsedAmount);
};

const parseCallbackMetadata = (stkCallback) => {
    const items = stkCallback?.CallbackMetadata?.Item || [];
    return items.reduce((metadata, item) => {
        if (item?.Name) metadata[item.Name] = item.Value;
        return metadata;
    }, {});
};

const getAccessToken = async () => {
    validateMpesaConfig();

    if (tokenCache.accessToken && Date.now() < tokenCache.expiresAt - TOKEN_REFRESH_BUFFER_MS) {
        return tokenCache.accessToken;
    }

    const auth = Buffer
        .from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`)
        .toString('base64');

    const response = await axios.get(
        `${getMpesaBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
        {
            headers: { Authorization: `Basic ${auth}` },
            timeout: 15000
        }
    );

    tokenCache.accessToken = response.data.access_token;
    tokenCache.expiresAt = Date.now() + (Number(response.data.expires_in || 3599) * 1000);

    return tokenCache.accessToken;
};

const findTransaction = (user, identifiers) => {
    return user.transactions.find((transaction) => (
        transaction.type === 'deposit' &&
        (
            (identifiers.checkoutRequestId && transaction.checkoutRequestId === identifiers.checkoutRequestId) ||
            (identifiers.merchantRequestId && transaction.merchantRequestId === identifiers.merchantRequestId) ||
            (identifiers.reference && transaction.reference === identifiers.reference) ||
            (identifiers.mpesaReceiptNumber && transaction.mpesaReceiptNumber === identifiers.mpesaReceiptNumber)
        )
    ));
};

const findUserByCallbackIdentifiers = async (identifiers) => {
    if (identifiers.checkoutRequestId) {
        const user = await User.findOne({ 'transactions.checkoutRequestId': identifiers.checkoutRequestId });
        if (user) return user;
    }

    if (identifiers.merchantRequestId) {
        const user = await User.findOne({ 'transactions.merchantRequestId': identifiers.merchantRequestId });
        if (user) return user;
    }

    if (identifiers.mpesaReceiptNumber) {
        const user = await User.findOne({ 'transactions.mpesaReceiptNumber': identifiers.mpesaReceiptNumber });
        if (user) return user;
    }

    if (identifiers.phone) {
        return User.findOne({ phone: identifiers.phone });
    }

    return null;
};

const findFallbackPendingTransaction = (user, amount) => {
    return user.transactions
        .filter((transaction) => (
            transaction.type === 'deposit' &&
            transaction.status === 'pending' &&
            (!amount || Math.abs(Number(transaction.amount) - Number(amount)) < 0.01)
        ))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
};

const getFailureStatus = (resultCode) => {
    const failureStatuses = {
        1: 'insufficient_funds',
        2: 'wrong_pin',
        1031: 'rejected',
        1032: 'cancelled',
        1037: 'timeout',
        2001: 'wrong_pin'
    };

    return failureStatuses[Number(resultCode)] || 'failed';
};

const getFailureReason = (resultCode, resultDesc) => {
    const reasons = {
        1: 'Insufficient funds in M-Pesa account',
        2: 'Incorrect M-Pesa PIN entered',
        1031: 'Transaction was rejected',
        1032: 'Transaction cancelled by user',
        1037: 'Transaction timed out',
        2001: 'Incorrect M-Pesa PIN entered'
    };

    return reasons[Number(resultCode)] || resultDesc || 'Transaction failed';
};

const sendMpesaAck = (res, resultDesc = 'Callback processed successfully') => {
    return res.status(200).json({
        ResultCode: 0,
        ResultDesc: resultDesc
    });
};

router.post('/stkpush', verifyJWT, async (req, res) => {
    try {
        validateMpesaConfig();

        const phone = normalizePhone(req.body.phone);
        const amount = parseAmount(req.body.amount);

        if (!phone) {
            return res.status(400).json({ message: 'Enter a valid Safaricom phone number' });
        }

        if (!amount) {
            return res.status(400).json({ message: 'Amount must be between KES 10 and KES 100,000' });
        }

        const user = await User.findOne({ username: req.user });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const accessToken = await getAccessToken();
        const timestamp = moment().format('YYYYMMDDHHmmss');
        const password = Buffer
            .from(`${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`)
            .toString('base64');
        const transactionRef = `JKUAT-${user.regno}-${timestamp}`;
        const accountReference = 'JKUAT Mess Wallet';

        const stkPushData = {
            BusinessShortCode: process.env.MPESA_SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: amount,
            PartyA: phone,
            PartyB: process.env.MPESA_SHORTCODE,
            PhoneNumber: phone,
            CallBackURL: getMpesaCallbackUrl(),
            AccountReference: accountReference,
            TransactionDesc: `Deposit to e-wallet for ${user.username}`
        };

        const response = await axios.post(
            `${getMpesaBaseUrl()}/mpesa/stkpush/v1/processrequest`,
            stkPushData,
            {
                headers: { Authorization: `Bearer ${accessToken}` },
                timeout: 20000
            }
        );

        if (String(response.data.ResponseCode) !== '0') {
            return res.status(502).json({
                message: response.data.CustomerMessage || response.data.ResponseDescription || 'M-Pesa rejected the STK request',
                response: response.data
            });
        }

        user.phone = phone;
        user.transactions.push({
            type: 'deposit',
            amount,
            status: 'pending',
            reference: transactionRef,
            merchantRequestId: response.data.MerchantRequestID,
            checkoutRequestId: response.data.CheckoutRequestID,
            phone,
            accountReference,
            description: stkPushData.TransactionDesc,
            resultDesc: response.data.CustomerMessage || response.data.ResponseDescription,
            timestamp: new Date()
        });
        await user.save();

        res.status(202).json({
            message: response.data.CustomerMessage || 'STK Push sent. Enter your M-Pesa PIN',
            transactionRef,
            merchantRequestId: response.data.MerchantRequestID,
            checkoutRequestId: response.data.CheckoutRequestID,
            response: response.data
        });
    } catch (error) {
        console.error('STK Push Error:', error.response?.data || error.message);
        res.status(error.statusCode || 500).json({
            message: 'Failed to send STK Push',
            error: error.response?.data || error.message
        });
    }
});

router.post('/callback', async (req, res) => {
    const stkCallback = req.body?.Body?.stkCallback || req.body?.stkCallback || req.body;

    if (!stkCallback || typeof stkCallback.ResultCode === 'undefined') {
        console.error('Invalid M-Pesa callback data:', req.body);
        return res.status(400).json({ message: 'Invalid M-Pesa callback data' });
    }

    try {
        const metadata = parseCallbackMetadata(stkCallback);
        const amount = metadata.Amount || stkCallback.Amount;
        const phone = normalizePhone(metadata.PhoneNumber || stkCallback.PhoneNumber);
        const identifiers = {
            checkoutRequestId: stkCallback.CheckoutRequestID,
            merchantRequestId: stkCallback.MerchantRequestID,
            mpesaReceiptNumber: metadata.MpesaReceiptNumber || stkCallback.TransactionId,
            phone
        };

        const user = await findUserByCallbackIdentifiers(identifiers);
        if (!user) {
            console.warn('M-Pesa callback did not match any user:', identifiers);
            return sendMpesaAck(res, 'Callback accepted but no matching user was found');
        }

        const transaction = findTransaction(user, identifiers) || findFallbackPendingTransaction(user, amount);
        if (!transaction) {
            console.warn('M-Pesa callback did not match any pending transaction:', identifiers);
            return sendMpesaAck(res, 'Callback accepted but no matching transaction was found');
        }

        const resultCode = Number(stkCallback.ResultCode);
        const commonUpdate = {
            'transactions.$.merchantRequestId': identifiers.merchantRequestId || transaction.merchantRequestId,
            'transactions.$.checkoutRequestId': identifiers.checkoutRequestId || transaction.checkoutRequestId,
            'transactions.$.phone': phone || transaction.phone || user.phone,
            'transactions.$.resultCode': resultCode,
            'transactions.$.resultDesc': stkCallback.ResultDesc,
            'transactions.$.callbackMetadata': metadata,
            'transactions.$.rawCallback': req.body
        };

        if (resultCode === 0) {
            const paidAmount = roundMoney(amount);

            if (!paidAmount) {
                await User.updateOne(
                    { _id: user._id, 'transactions._id': transaction._id },
                    {
                        $set: {
                            ...commonUpdate,
                            'transactions.$.status': 'failed',
                            'transactions.$.failureReason': 'Successful callback was missing the paid amount'
                        }
                    }
                );
                return sendMpesaAck(res, 'Callback accepted but amount was missing');
            }

            if (Math.abs(paidAmount - Number(transaction.amount)) > 0.01) {
                await User.updateOne(
                    { _id: user._id, 'transactions._id': transaction._id },
                    {
                        $set: {
                            ...commonUpdate,
                            'transactions.$.status': 'failed',
                            'transactions.$.failureReason': `Amount mismatch. Expected ${transaction.amount}, got ${paidAmount}`
                        }
                    }
                );
                return sendMpesaAck(res, 'Callback accepted but amount mismatch was detected');
            }

            if (transaction.status === 'completed') {
                return sendMpesaAck(res, 'Callback already processed');
            }

            const balanceBefore = roundMoney(user.balance);
            const balanceAfter = roundMoney(balanceBefore + paidAmount);
            const updatedUser = await User.findOneAndUpdate(
                {
                    _id: user._id,
                    'transactions._id': transaction._id,
                    'transactions.status': 'pending'
                },
                {
                    $inc: { balance: paidAmount },
                    $set: {
                        ...commonUpdate,
                        'transactions.$.status': 'completed',
                        'transactions.$.mpesaReceiptNumber': identifiers.mpesaReceiptNumber,
                        'transactions.$.balanceBefore': balanceBefore,
                        'transactions.$.balanceAfter': balanceAfter,
                        'transactions.$.completedAt': new Date()
                    },
                    $unset: {
                        'transactions.$.failureReason': ''
                    }
                },
                { new: true }
            );

            if (!updatedUser) {
                return sendMpesaAck(res, 'Callback already processed');
            }

            console.log(`M-Pesa deposit completed for ${user.username}: KES ${paidAmount}`);
            return sendMpesaAck(res);
        }

        const failureStatus = getFailureStatus(resultCode);
        await User.updateOne(
            {
                _id: user._id,
                'transactions._id': transaction._id,
                'transactions.status': 'pending'
            },
            {
                $set: {
                    ...commonUpdate,
                    'transactions.$.status': failureStatus,
                    'transactions.$.failureReason': getFailureReason(resultCode, stkCallback.ResultDesc)
                }
            }
        );

        console.log(`M-Pesa deposit ${failureStatus} for ${user.username}: ${stkCallback.ResultDesc}`);
        return sendMpesaAck(res);
    } catch (error) {
        console.error('Error processing M-Pesa callback:', error);
        return sendMpesaAck(res, 'Callback accepted but processing failed internally');
    }
});

router.get('/transaction/:reference', verifyJWT, async (req, res) => {
    try {
        const user = await User.findOne({ username: req.user });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const transaction = findTransaction(user, { reference: req.params.reference }) ||
            findTransaction(user, { checkoutRequestId: req.params.reference }) ||
            findTransaction(user, { merchantRequestId: req.params.reference }) ||
            findTransaction(user, { mpesaReceiptNumber: req.params.reference });

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        res.json({
            status: transaction.status,
            amount: roundMoney(transaction.amount),
            type: transaction.type,
            reference: transaction.reference,
            mpesaReceiptNumber: transaction.mpesaReceiptNumber,
            merchantRequestId: transaction.merchantRequestId,
            checkoutRequestId: transaction.checkoutRequestId,
            failureReason: transaction.failureReason,
            timestamp: transaction.timestamp,
            completedAt: transaction.completedAt
        });
    } catch (error) {
        console.error('Error checking transaction status:', error);
        res.status(500).json({ message: 'Failed to check transaction status' });
    }
});

router.get('/receipt/:reference', verifyJWT, async (req, res) => {
    try {
        const user = await User.findOne({ username: req.user });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const transaction = findTransaction(user, { reference: req.params.reference }) ||
            findTransaction(user, { checkoutRequestId: req.params.reference }) ||
            findTransaction(user, { merchantRequestId: req.params.reference }) ||
            findTransaction(user, { mpesaReceiptNumber: req.params.reference });

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        res.json(buildWalletReceipt(user, transaction));
    } catch (error) {
        console.error('Error generating wallet receipt:', error);
        res.status(500).json({ message: 'Failed to generate receipt' });
    }
});

router.get('/balance', verifyJWT, async (req, res) => {
    try {
        const user = await User.findOne({ username: req.user });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const transactions = (user.transactions || [])
            .slice()
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .map((transaction) => ({
                type: transaction.type,
                amount: roundMoney(transaction.amount),
                timestamp: transaction.timestamp,
                status: transaction.status,
                reference: transaction.reference,
                receiptNumber: transaction.receiptNumber,
                orderId: transaction.orderId,
                mpesaReceiptNumber: transaction.mpesaReceiptNumber,
                failureReason: transaction.failureReason,
                completedAt: transaction.completedAt
            }));

        res.json({
            balance: roundMoney(user.balance || 0),
            transactions
        });
    } catch (error) {
        console.error('Error fetching balance:', error);
        res.status(500).json({ message: 'Failed to fetch balance' });
    }
});

module.exports = router;
