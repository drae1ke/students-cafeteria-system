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

// Get all menu items
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

// Get single menu item
const getMenuItem = async (req, res) => {
    try {
        const item = await MenuItem.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ error: 'Menu item not found' });
        }
        res.json(item);
    } catch (error) {
        console.error('Error fetching menu item:', error);
        res.status(500).json({ error: 'Failed to load menu item' });
    }
};

// Delete menu item
const deleteMenuItem = async (req, res) => {
    try {
        const item = await MenuItem.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ message: 'Menu item not found' });
        }

        // Delete image from Cloudinary if it exists
        if (item.image) {
            try {
                const publicId = item.image.split('/').pop().split('.')[0];
                // Add timestamp and folder to the public_id
                const fullPublicId = `menu-items/${publicId}`;
                console.log('Attempting to delete image:', fullPublicId);
                
                await cloudinary.uploader.destroy(fullPublicId, {
                    invalidate: true,
                    resource_type: "image"
                });
            } catch (cloudinaryError) {
                console.error('Cloudinary deletion error:', cloudinaryError);
                // Continue with item deletion even if image deletion fails
            }
        }

        // Delete the menu item from database
        await MenuItem.findByIdAndDelete(req.params.id);
        res.json({ message: 'Menu item deleted successfully' });
    } catch (error) {
        console.error('Error deleting menu item:', error);
        res.status(500).json({ message: 'Failed to delete menu item', error: error.message });
    }
};

// Update menu item
const updateMenuItem = async (req, res) => {
    try {
        const { name, description, price, category, availability } = req.body;
        const updateData = {
            name,
            description,
            price: parseFloat(price),
            category,
            availability: availability === 'true' || availability === true
        };

        // Handle image upload if new image is provided
        if (req.file) {
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
            updateData.image = result.secure_url;

            // Delete old image from Cloudinary
            const oldItem = await MenuItem.findById(req.params.id);
            if (oldItem && oldItem.image) {
                const publicId = oldItem.image.split('/').pop().split('.')[0];
                await cloudinary.uploader.destroy(`menu-items/${publicId}`);
            }
        }

        const updatedItem = await MenuItem.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!updatedItem) {
            return res.status(404).json({ error: 'Menu item not found' });
        }

        res.json({
            message: 'Menu item updated successfully',
            item: updatedItem
        });
    } catch (error) {
        console.error('Error updating menu item:', error);
        res.status(500).json({ error: 'Failed to update menu item' });
    }
};

module.exports = {
    upload,
    addMenuItem,
    getMenuItems,
    getMenuItem,
    deleteMenuItem,
    updateMenuItem
};