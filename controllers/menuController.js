
const MenuItem = require('../model/meal');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary (add to your env variables)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer for temporary file storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

const addMenuItem = async (req, res) => {
  try {
    // Validate required fields
    const { name, description, price, category } = req.body;
    if (!name || !description || !price || !category) {
      req.flash('error', 'Please fill all required fields');
      return res.redirect('/add');
    }

    // Handle image upload
    if (!req.file) {
      req.flash('error', 'Please upload an image');
      return res.redirect('/add');
    }

    // Upload image to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'menu-items' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });
    // Create new menu item
    const newItem = await MenuItem.create({
        name,
        description,
        price: parseFloat(price),
        category,
        availability: true,
        image: result.secure_url,
    });


    console.log(newItem);



    req.flash('success', 'Menu item added successfully');
    res.redirect('/add');
  } catch (error) {
    console.error('Error adding menu item:', error);
    req.flash('error', error.message || 'Failed to add menu item');
    res.redirect('/add');
  }
};

// Update getMenuItems function
const getMenuItems = async (req, res) => {
  try {
    const menuItems = await MenuItem.find({});
    res.json(menuItems.map(item => ({
      _id: item._id,
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      availability: item.availability,
      image: item.image,
      nutritionalInfo: item.nutritionalInfo
    })));
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({ error: 'Failed to load menu' });
  }
};

module.exports = {upload,addMenuItem,getMenuItems};