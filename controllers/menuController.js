
const MenuItem = require('../model/meal');
const multer = require('multer');
const cloudinary = require('cloudinary').v2; // Assuming you're using Cloudinary

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
    const result = await cloudinary.uploader.upload_stream({
      resource_type: 'auto',
      folder: 'menu-items'
    }).end(req.file.buffer);

    // Create new menu item
    const newItem = new MenuItem({
      name: req.body.name,
      description: req.body.description,
      price: parseFloat(req.body.price),
      category: req.body.category,
      availability: req.body.availability === 'on',
      image: result.secure_url,
      nutritionalInfo: {
        calories: req.body.nutritionalInfo?.calories || null,
        allergens: req.body.nutritionalInfo?.allergens?.split(',') || []
      }
    });

    // Save to database
    await newItem.save();

    req.flash('success', 'Menu item added successfully');
    res.redirect('/add');
  } catch (error) {
    console.error('Error adding menu item:', error);
    req.flash('error', error.message || 'Failed to add menu item');
    res.redirect('/add');
  }
};

module.exports = {upload,addMenuItem};