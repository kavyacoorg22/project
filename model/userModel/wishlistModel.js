const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'product'
  }]
},{timestamps:true});


module.exports = mongoose.model('wishlist',wishlistSchema)