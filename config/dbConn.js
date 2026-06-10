const mongoose = require('mongoose')

const connectDB = async () => {
  try {
    const options = {
      serverSelectionTimeoutMS: 10000,
      tls: true
    }
    await mongoose.connect(process.env.DATABASE_URI, options)
    console.log('Connected to MongoDB Atlas!')
  } catch (err) {
    console.error('Connection failed:')
    console.error(err && err.stack ? err.stack : err)
    process.exit(1)
  }
}

module.exports = connectDB