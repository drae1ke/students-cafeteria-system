const express = require('express');
const router = express.Router();
const { login, signup } = require('../controllers/adminAuthController');
const verifyJWT = require('../middleware/verifyJWT');

router.get('/dashboard', verifyJWT, (req, res) => {
    res.render('dashboard');
});

router.post('/login', login);
router.post('/signup', signup);

module.exports = router;