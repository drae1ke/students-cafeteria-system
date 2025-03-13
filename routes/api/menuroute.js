const express = require('express');
const router = express.Router();
const { upload, addMenuItem,getMenuItems } = require('../../controllers/menuController');

// Display add form
router.get('/add', (req, res) => {
  res.render('add', { 
    messages: req.flash() 
  });
});

// Handle form submission
router.post('/', upload.single('image'), addMenuItem);
router.get('/menuroute', getMenuItems);

module.exports = router;