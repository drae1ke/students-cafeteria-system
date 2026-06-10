require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../model/admin');
const MenuItem = require('../model/meal');

const databaseUri = process.env.DATABASE_URI || process.env.MONGODB_URI;
const adminEmail = (process.env.SEED_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'admin@cafeteria.local').toLowerCase();
const adminPassword = process.env.SEED_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'ChangeMe123!';

const menuItems = [
  {
    name: 'Chapati',
    description: 'Fresh chapati served warm.',
    price: 15,
    category: 'main course',
    availability: true,
    image: '/img/chapati.jpg',
    nutritionalInfo: {
      calories: 120,
      allergens: ['gluten']
    }
  },
  {
    name: 'Bean Stew',
    description: 'Slow cooked beans with mild spices.',
    price: 40,
    category: 'main course',
    availability: true,
    image: '/img/bean stew.jpeg',
    nutritionalInfo: {
      calories: 240,
      allergens: []
    }
  },
  {
    name: 'Ugali and Fish',
    description: 'Ugali served with tilapia and vegetables.',
    price: 180,
    category: 'special',
    availability: true,
    image: '/img/ugali fish.jpg',
    nutritionalInfo: {
      calories: 520,
      allergens: ['fish']
    }
  },
  {
    name: 'Plain Rice',
    description: 'Steamed rice served as a filling side.',
    price: 60,
    category: 'main course',
    availability: true,
    image: '/img/Rice.jpg',
    nutritionalInfo: {
      calories: 210,
      allergens: []
    }
  },
  {
    name: 'Beef Stew',
    description: 'Tender beef stew with house seasoning.',
    price: 150,
    category: 'main course',
    availability: true,
    image: '/img/beef.jpg',
    nutritionalInfo: {
      calories: 430,
      allergens: []
    }
  },
  {
    name: 'Spaghetti',
    description: 'Simple spaghetti plate with tomato sauce.',
    price: 80,
    category: 'main course',
    availability: true,
    image: '/img/food4.jpg',
    nutritionalInfo: {
      calories: 360,
      allergens: ['gluten']
    }
  },
  {
    name: 'Tea',
    description: 'Hot Kenyan tea.',
    price: 20,
    category: 'beverage',
    availability: true,
    image: '/img/pexels-janetrangdoan-1099680.jpg',
    nutritionalInfo: {
      calories: 90,
      allergens: ['milk']
    }
  },
  {
    name: 'Fresh Juice',
    description: 'Seasonal fruit juice.',
    price: 70,
    category: 'beverage',
    availability: true,
    image: '/img/pexels-ella-olsson-572949-1640772.jpg',
    nutritionalInfo: {
      calories: 140,
      allergens: []
    }
  }
];

const connect = async () => {
  if (!databaseUri) {
    throw new Error('DATABASE_URI or MONGODB_URI is required to seed data.');
  }

  const options = { serverSelectionTimeoutMS: 10000 };
  if (databaseUri.startsWith('mongodb+srv://') || process.env.MONGO_TLS === 'true') {
    options.tls = true;
  }

  await mongoose.connect(databaseUri, options);
};

const seedAdmin = async () => {
  if (adminPassword.length < 8) {
    throw new Error('Seed admin password must be at least 8 characters.');
  }

  const existingAdmin = await Admin.findOne({ email: adminEmail });
  if (existingAdmin) {
    console.log(`Admin already exists: ${adminEmail}`);
    return;
  }

  await Admin.create({
    email: adminEmail,
    password: adminPassword
  });

  console.log(`Created admin: ${adminEmail}`);
  if (!process.env.SEED_ADMIN_PASSWORD && !process.env.ADMIN_PASSWORD) {
    console.log('Default admin password: ChangeMe123!');
    console.log('Set SEED_ADMIN_PASSWORD before running this in production.');
  }
};

const seedMenu = async () => {
  let inserted = 0;

  for (const item of menuItems) {
    const exists = await MenuItem.exists({ name: item.name });
    if (exists) continue;

    await MenuItem.create(item);
    inserted += 1;
  }

  console.log(`Menu seed complete. Inserted ${inserted}, skipped ${menuItems.length - inserted}.`);
};

const run = async () => {
  try {
    await connect();
    await seedAdmin();
    await seedMenu();
  } finally {
    await mongoose.connection.close();
  }
};

if (require.main === module) {
  run()
    .then(() => {
      console.log('Seeding finished.');
    })
    .catch((error) => {
      console.error('Seeding failed:', error.message);
      process.exitCode = 1;
    });
}

module.exports = {
  menuItems,
  run,
  seedAdmin,
  seedMenu
};
