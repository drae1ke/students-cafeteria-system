const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: ['appetizer', 'main course', 'dessert', 'beverage', 'special']
  },
  availability: {
    type: Boolean,
    default: true
  },
  image: {
    type: String,
    required: true
  },
  nutritionalInfo: {
    calories: Number,
    allergens: [String]
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('MenuItem', menuItemSchema);