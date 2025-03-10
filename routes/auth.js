
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/', (req, res) => {
    res.render('signin', { 
        success: req.flash('success'),
        error: req.flash('error') 
    });
});

router.post('/', authController.handleLogin); 

module.exports = router;