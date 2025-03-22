// routes/password.js
const router = require('express').Router();
const forgotPasswordController = require('../controllers/forgotPasswordController');

// API endpoints for password reset
router.post('/forgot-password', forgotPasswordController.forgotPassword);
router.patch('/reset-password/:token', forgotPasswordController.resetPassword);

// Page render route (must be added to work with the frontend)
router.get('/reset-password/:token', forgotPasswordController.getResetPage);

module.exports = router;