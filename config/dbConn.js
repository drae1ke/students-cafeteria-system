const mongoose = require('mongoose')

const connectDB = async () => {
    try {
      await mongoose.connect(process.env.DATABASE_URI);
      console.log("Connected to MongoDB Atlas!");
    } catch (err) {
      console.error("Connection failed:", err);
    }
  };

  module.exports = connectDB