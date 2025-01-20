const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
    {
        user: { 
          type: mongoose.Schema.Types.ObjectId, 
          ref: "signup", 
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
       },
    { timestamps: true }
);

module.exports = mongoose.model("cart", cartSchema);
