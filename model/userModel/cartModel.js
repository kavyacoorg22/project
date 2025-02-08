const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
    {
        user: { 
          type: mongoose.Schema.Types.ObjectId, 
          ref: "users", 
          required: true 
        },
        totalPrice: {
           type: Number, 
           required: true 
          },
        product: [
            {
                product: {
                   type: mongoose.Schema.Types.ObjectId,
                    ref: "product", 
                    required: true },
                quantity: { 
                  type: Number, 
                  required: true },
            },
        ],
        appliedCoupon: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Coupon'
      },
      discountAmount: {
        type: Number,
        default: 0
    },
    finalAmount: {
        type: Number,
        default: 0
    },
    couponCode:{
      type:String,
      default:null
    }
       },

    { timestamps: true }
);

module.exports = mongoose.model("cart", cartSchema);
