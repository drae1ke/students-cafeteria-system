const express = require('express');
const router = express.Router();
const path = require('path');

router.get('/', (req, res) => {
    res.render('index');
});

router.get('/signin', (req, res) => {
    res.render('signin');
});

router.get('/adminform', (req,res) =>{
    res.render('adminform')
});

router.get('/e-wallet',(req,res)=>{
    res.render('e-wallet');
})

router.get('/menu', (req, res) => {
    res.render('menu');
});

router.get('/checkout', (req, res) => {
    res.render('checkout');
});

router.get('/dashboard', (req, res) => {
    res.render('dashboard');
});


router.get('/profile', (req, res) => {
    res.render('profile');
});

router.get('/add', (req, res) => {
    res.render('add');
});

router.get('/transfer', (req, res) => {
    res.render('transfer');
});

module.exports = router;