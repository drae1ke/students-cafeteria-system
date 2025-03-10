// routes/authRoutes.js
const router = require('express').Router();
const forgotPassword = require('../controllers/forgotPasswordController');

router.post('/forgot-password', forgotPassword.forgotPassword);
router.patch('/reset-password/:token', forgotPassword.resetPassword);


module.exports = router;