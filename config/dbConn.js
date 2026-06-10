const mongoose = require('mongoose');

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const connectDB = async () => {
  const uri = process.env.DATABASE_URI;
  if (!uri) {
    throw new Error('DATABASE_URI is required.');
  }

  const options = {
    serverSelectionTimeoutMS: toNumber(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS, 15000),
    maxPoolSize: toNumber(process.env.MONGO_MAX_POOL_SIZE, 10)
  };

  if (uri.startsWith('mongodb+srv://') || process.env.MONGO_TLS === 'true') {
    options.tls = true;
  }

  try {
    await mongoose.connect(uri, options);
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection failed:');
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  }
};

module.exports = connectDB;
