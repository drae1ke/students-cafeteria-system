const express = require('express');
const router = express.Router();
const path = require('path');

router.get('/', (req, res) => {
    res.render('index');
});

router.get('/signin', (req, res) => {
    res.render('signin');
});

router.get('/e-wallet',(req,res)=>{
    res.render('e-wallet');
})

module.exports = router;