// models/Review.js
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'product',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'signup',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  review: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
},{timestamps:true});

module.exports = mongoose.model('review', reviewSchema);