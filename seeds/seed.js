require('dotenv').config();
const connectDB = require('../config/dbConn');
const Admin = require('../model/admin');
const MenuItem = require('../model/meal');

const adminEmail = 'moses@gmail.com';
const adminPassword = '12345678';

const menuSeed = [
  {
    name: 'Chapati and Tea',
    description: 'Fresh chapati served with hot tea',
    price: 1099,
    category: 'main course',
    availability: true,
    image: '/img/chapati.jpg',
    nutritionalInfo: { calories: 450, allergens: ['gluten'] }
  },
  {
    name: 'Bean Stew',
    description: 'Traditional bean stew with spices',
    price: 2099,
    category: 'main course',
    availability: true,
    image: '/img/bean stew.jpeg',
    nutritionalInfo: { calories: 380, allergens: [] }
  },
  {
    name: 'Ugali and Fish',
    description: 'Tilapia fish served with ugali',
    price: 6099,
    category: 'main course',
    availability: true,
    image: '/img/ugali fish.jpg',
    nutritionalInfo: { calories: 650, allergens: ['fish'] }
  },
  {
    name: 'Plain Rice',
    description: 'Grade 1 Pishori rice',
    price: 2599,
    category: 'main course',
    availability: true,
    image: '/img/Rice.jpg',
    nutritionalInfo: { calories: 520, allergens: [] }
  },
  {
    name: 'Beef Stew',
    description: 'Tasty beef stew with natural spices',
    price: 1599,
    category: 'main course',
    availability: true,
    image: '/img/beef.jpg',
    nutritionalInfo: { calories: 560, allergens: [] }
  }
];

async function seed() {
  try {
    await connectDB();

    // Seed admin
    const existingAdmin = await Admin.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log('Admin already exists:', adminEmail);
    } else {
      const admin = new Admin({ email: adminEmail, password: adminPassword });
      await admin.save();
      console.log('Created admin:', adminEmail);
    }

    // Seed menu items
    for (const item of menuSeed) {
      const exists = await MenuItem.findOne({ name: item.name });
      if (exists) {
        console.log('Menu item exists, skipping:', item.name);
        continue;
      }
      const mi = new MenuItem(item);
      await mi.save();
      console.log('Inserted menu item:', item.name);
    }

    console.log('Seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
