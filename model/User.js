const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    username: {
        type: String,
        required: true
    },
    roles: {
        User: {
            type: Number,
            default: 2001
        },
        Editor: Number,
        Admin: Number
    },
    email: {
        type: String,
        required: true
    },
    regno: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    refreshToken: String,
    eWallets: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EWallet',
    },
    // Add balance field to track user's wallet amount
    balance: {
        type: Number,
        default: 0
    },
    // Add phone field to link M-Pesa transactions
    phone: {
        type: String
    },
    // Add transaction history
    transactions: [{
        type: {
            type: String,
            enum: ['deposit', 'payment'],
            required: true
        },
        amount: {
            type: Number,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: [
                'pending',           // Initial state when STK push is sent
                'completed',         // Transaction successful
                'failed',           // Generic failure
                'insufficient_funds', // M-Pesa account has insufficient funds
                'wrong_pin',        // User entered wrong PIN
                'cancelled',        // User cancelled the transaction
                'timeout',          // Transaction timed out
                'rejected'          // Transaction was rejected
            ],
            default: 'pending'
        },
        reference: String,
        failureReason: String      // Added to store detailed failure reason
    }],
    // Existing fields for password reset functionality
    passwordResetToken: String,
    passwordResetExpires: Date
});

module.exports = mongoose.model('User', userSchema);