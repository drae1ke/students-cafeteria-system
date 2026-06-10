const express = require('express');
const router = express.Router();
const { 
    upload, 
    addMenuItem, 
    getMenuItems, 
    getMenuItem,
    deleteMenuItem, 
    updateMenuItem 
} = require('../../controllers/menuController');
const verifyJWT = require('../../middleware/verifyJWT');
const verifyRoles = require('../../middleware/verifyRoles');
const ROLES_LIST = require('../../config/roles_list');

// Public route for add form
router.get('/add', (req, res) => {
    res.render('add', { messages: req.flash() });
});

// Menu API endpoints
router.get('/api/menu', verifyJWT, getMenuItems);
router.get('/api/menu/:id', verifyJWT, getMenuItem);
router.post('/api/menu', verifyJWT, verifyRoles(ROLES_LIST.Admin), upload.single('image'), addMenuItem);
router.delete('/api/menu/:id', verifyJWT, verifyRoles(ROLES_LIST.Admin), deleteMenuItem);
router.patch('/api/menu/:id', verifyJWT, verifyRoles(ROLES_LIST.Admin), upload.single('image'), updateMenuItem);

module.exports = router;
