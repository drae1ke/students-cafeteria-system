const express = require('express');
const axios = require('axios');
const moment = require('moment');
require('dotenv').config();
const User = require('../model/User');
const verifyJWT = require('../middleware/verifyJWT');

const router = express.Router();

// Generate M-Pesa Access Token
const getAccessToken = async () => {
    const url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
    const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');

    try {
        const response = await axios.get(url, {
            headers: { Authorization: `Basic ${auth}` }
        });
        return response.data.access_token;
    } catch (error) {
        console.error("Error fetching access token:", error.response?.data || error.message);
        throw new Error("Failed to get access token");
    }
};

// Initiate STK Push (Protected by JWT)
router.post('/stkpush', verifyJWT, async (req, res) => {
    const { phone, amount } = req.body;
    const username = req.user; // Get username from the JWT verification middleware

    if (!phone || !amount) {
        return res.status(400).json({ message: "Phone number and amount are required" });
    }

    try {
        // Find the user and update their phone number if not already set
        const user = await User.findOne({ username: username });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Update user's phone number if not already set
        if (!user.phone) {
            const formattedPhone = phone.replace(/^(\+?254|0)/, "254");
            user.phone = formattedPhone;
            await user.save();
        }

        const formattedPhone = phone.replace(/^(\+?254|0)/, "254");
        const accessToken = await getAccessToken();

        const timestamp = moment().format("YYYYMMDDHHmmss");
        const password = Buffer.from(`${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`).toString("base64");

        // Create a unique reference for this transaction
        const transactionRef = `JKUAT-${user.regno}-${timestamp}`;

        const stkPushData = {
            BusinessShortCode: process.env.MPESA_SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: "CustomerPayBillOnline",
            Amount: amount,
            PartyA: formattedPhone,
            PartyB: process.env.MPESA_SHORTCODE,
            PhoneNumber: formattedPhone,
            CallBackURL: "https://e78e-217-199-148-231.ngrok-free.app/api/mpesa/callback",
            AccountReference: "JKUAT Mess Wallet",
            TransactionDesc: `Deposit to e-wallet for ${user.username}`
        };

        // Add a pending transaction to the user's transactions array
        user.transactions.push({
            type: 'deposit',
            amount: Number(amount),
            status: 'pending',
            reference: transactionRef,
            timestamp: new Date()
        });
        await user.save();

        console.log("Sending STK Push with data:", {
            ...stkPushData,
            Password: "***" // Hide sensitive data in logs
        });

        const response = await axios.post(
            "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
            stkPushData,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        console.log("STK Push Response:", response.data);
        res.json({ 
            message: "STK Push sent. Enter your M-Pesa PIN", 
            response: response.data,
            transactionRef: transactionRef
        });

    } catch (error) {
        console.error("STK Push Error:", error.response?.data || error.message);
        res.status(500).json({ 
            message: "Failed to send STK Push", 
            error: error.response?.data || error.message 
        });
    }
});

// Handle M-Pesa Callback
router.post('/callback', async (req, res) => {
    console.log("Received M-Pesa callback at:", new Date().toISOString());
    console.log("Raw callback data:", JSON.stringify(req.body, null, 2));

    // Handle different possible callback formats
    let callbackData;
    if (req.body.Body?.stkCallback) {
        callbackData = req.body;
    } else if (req.body.Body) {
        callbackData = req.body;
    } else {
        callbackData = { Body: { stkCallback: req.body } };
    }

    console.log("Processed callback data:", JSON.stringify(callbackData, null, 2));

    if (!callbackData.Body?.stkCallback) {
        console.error("Invalid callback data structure:", callbackData);
        return res.status(400).json({ message: "Invalid M-Pesa callback data" });
    }

    const resultCode = callbackData.Body.stkCallback.ResultCode;
    const resultDesc = callbackData.Body.stkCallback.ResultDesc;
    
    console.log(`Processing callback with ResultCode: ${resultCode}, Description: ${resultDesc}`);
    
    try {
        // Extract phone number from callback data
        let phoneNumber;
        if (callbackData.Body.stkCallback.PhoneNumber) {
            phoneNumber = callbackData.Body.stkCallback.PhoneNumber;
        } else if (callbackData.Body.stkCallback.CallbackMetadata?.Item) {
            const phoneItem = callbackData.Body.stkCallback.CallbackMetadata.Item.find(
                item => item.Name === "PhoneNumber"
            );
            if (phoneItem) {
                phoneNumber = phoneItem.Value;
            }
        }

        if (!phoneNumber) {
            console.error("No phone number found in callback data");
            return res.json({ message: "No phone number found in callback" });
        }

        const formattedPhone = String(phoneNumber).replace(/^(\+?254|0)/, "254");
        console.log(`Looking up user with phone: ${formattedPhone}`);
        
        const user = await User.findOne({ phone: formattedPhone });
        
        if (!user) {
            console.log(`User not found for phone: ${formattedPhone}`);
            return res.json({ message: "User not found for this phone number" });
        }

        console.log(`Found user: ${user.username}, Current balance: ${user.balance}`);

        // Find the most recent pending transaction
        const pendingTransaction = user.transactions
            .filter(t => t.status === 'pending' && t.type === 'deposit')
            .sort((a, b) => b.timestamp - a.timestamp)[0];

        if (!pendingTransaction) {
            console.log("No pending transaction found for user:", user.username);
            return res.json({ message: "No pending transaction found" });
        }

        console.log(`Found pending transaction: Amount: ${pendingTransaction.amount}, Reference: ${pendingTransaction.reference}`);

        // Handle different result codes
        switch (resultCode) {
            case 0: // Success
                let amount, transactionId;
                
                if (callbackData.Body.stkCallback.CallbackMetadata?.Item) {
                    const metadata = callbackData.Body.stkCallback.CallbackMetadata.Item;
                    amount = metadata.find(item => item.Name === "Amount")?.Value;
                    transactionId = metadata.find(item => item.Name === "MpesaReceiptNumber")?.Value;
                } else {
                    amount = callbackData.Body.stkCallback.Amount;
                    transactionId = callbackData.Body.stkCallback.TransactionId;
                }

                if (!amount) {
                    console.error("Missing amount in callback");
                    return res.json({ message: "Callback received but missing amount" });
                }

                console.log(`Processing successful transaction - Amount: ${amount}, Receipt: ${transactionId}`);

                // Verify the amount matches
                if (Math.abs(Number(amount) - pendingTransaction.amount) > 0.01) {
                    console.error(`Amount mismatch: Expected ${pendingTransaction.amount}, got ${amount}`);
                    return res.json({ message: "Amount mismatch in transaction" });
                }

                // Update user's balance and transaction status
                const oldBalance = user.balance;
                user.balance += Number(amount);
                pendingTransaction.status = 'completed';
                pendingTransaction.reference = transactionId;
                
                console.log(`Updating balance from ${oldBalance} to ${user.balance}`);
                
                try {
                    await user.save();
                    console.log(`Successfully saved user data. New balance: ${user.balance}`);
                } catch (saveError) {
                    console.error("Error saving user data:", saveError);
                    throw saveError;
                }
                break;

            case 1: // Insufficient funds
                pendingTransaction.status = 'insufficient_funds';
                pendingTransaction.failureReason = 'Insufficient funds in M-Pesa account';
                await user.save();
                console.log(`Transaction failed for ${user.username}: Insufficient funds`);
                break;

            case 2: // Wrong PIN
                pendingTransaction.status = 'wrong_pin';
                pendingTransaction.failureReason = 'Incorrect M-Pesa PIN entered';
                await user.save();
                console.log(`Transaction failed for ${user.username}: Wrong PIN`);
                break;

            case 1032: // Request cancelled by user
                pendingTransaction.status = 'cancelled';
                pendingTransaction.failureReason = 'Transaction cancelled by user';
                await user.save();
                console.log(`Transaction failed for ${user.username}: Cancelled by user`);
                break;

            case 1037: // Timeout
                pendingTransaction.status = 'timeout';
                pendingTransaction.failureReason = 'Transaction timed out';
                await user.save();
                console.log(`Transaction failed for ${user.username}: Timeout`);
                break;

            case 1031: // Rejected
                pendingTransaction.status = 'rejected';
                pendingTransaction.failureReason = 'Transaction was rejected';
                await user.save();
                console.log(`Transaction failed for ${user.username}: Rejected`);
                break;

            default:
                pendingTransaction.status = 'failed';
                pendingTransaction.failureReason = resultDesc || 'Transaction failed';
                await user.save();
                console.log(`Transaction failed for ${user.username}: ${resultDesc}`);
        }

    } catch (error) {
        console.error("Error processing callback:", error);
        console.error("Error stack:", error.stack);
    }

    // Always send a response to M-Pesa
    res.status(200).json({ message: "Callback processed successfully" });
});

// Add an endpoint to check transaction status
router.get('/transaction/:reference', verifyJWT, async (req, res) => {
    try {
        const { reference } = req.params;
        const username = req.user;
        
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        const transaction = user.transactions.find(t => t.reference === reference);
        if (!transaction) {
            return res.status(404).json({ message: "Transaction not found" });
        }
        
        res.json({
            status: transaction.status,
            amount: transaction.amount,
            type: transaction.type,
            timestamp: transaction.timestamp
        });
        
    } catch (error) {
        console.error("Error checking transaction status:", error);
        res.status(500).json({ message: "Failed to check transaction status" });
    }
});

// Add an endpoint to get user's balance
router.get('/balance', verifyJWT, async (req, res) => {
    try {
        const username = req.user;
        
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        res.json({
            balance: user.balance || 0,
            transactions: user.transactions || []
        });
        
    } catch (error) {
        console.error("Error fetching balance:", error);
        res.status(500).json({ message: "Failed to fetch balance" });
    }
});

module.exports = router;