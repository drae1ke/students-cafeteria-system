const express = require('express');
const axios = require('axios');
const moment = require('moment');
require('dotenv').config();
const User = require('../model/User');

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
        console.error("Error fetching access token:", error.response.data);
        throw new Error("Failed to get access token");
    }
};

// Initiate STK Push
router.post('/stkpush', async (req, res) => {
    const { phone, amount } = req.body;

    if (!phone || !amount) {
        return res.status(400).json({ message: "Phone number and amount are required" });
    }

    const formattedPhone = phone.replace(/^(\+?254|0)/, "254");
    const accessToken = await getAccessToken();

    const timestamp = moment().format("YYYYMMDDHHmmss");
    const password = Buffer.from(`${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`).toString("base64");

    const stkPushData = {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: formattedPhone,
        PartyB: process.env.MPESA_SHORTCODE,
        PhoneNumber: formattedPhone,
        CallBackURL: process.env.MPESA_CALLBACK_URL,
        AccountReference: "JKUAT Mess Wallet",
        TransactionDesc: `Deposit to e-wallet`
    };

    try {
        const response = await axios.post(
            "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
            stkPushData,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        console.log("STK Push Response:", response.data);
        res.json({ message: "STK Push sent. Enter your M-Pesa PIN", response: response.data });

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
    const callbackData = req.body;

    if (!callbackData.Body.stkCallback) {
        return res.status(400).json({ message: "Invalid M-Pesa callback data" });
    }

    const resultCode = callbackData.Body.stkCallback.ResultCode;
    const amount = callbackData.Body.stkCallback.CallbackMetadata?.Item?.find(item => item.Name === "Amount")?.Value;
    const phoneNumber = callbackData.Body.stkCallback.CallbackMetadata?.Item?.find(item => item.Name === "PhoneNumber")?.Value;

    if (resultCode === 0) {
        // Update user's balance
        const user = await User.findOne({ phone: phoneNumber });

        if (user) {
            user.balance += amount;
            await user.save();
            console.log(`Updated balance for ${phoneNumber}: KES ${user.balance}`);
        } else {
            console.log(`User not found for phone: ${phoneNumber}`);
        }
    } else {
        console.log("Transaction failed:", callbackData.Body.stkCallback.ResultDesc);
    }

    res.json({ message: "Callback received" });
});

module.exports = router;
