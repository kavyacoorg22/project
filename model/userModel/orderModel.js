const mongoose = require('mongoose');


const OrderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'signup', // Reference to the User model
    required: true,
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0, // Total price should be non-negative
  },
  status: {
    type: String,
    enum: ['pending', 'delivered', 'cancelled', 'shipped'], // Enum for order status
    default: 'pending',
  },
  products: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'product', // Direct reference to the Product schema
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: 1, 
      },
    },
  ],
  coupon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'coupon', 
    default: null,
  },
}, {
  timestamps: true, 
});




module.exports = mongoose.model('order', OrderSchema);
