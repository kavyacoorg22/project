const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    couponCode: {
      type: String,
      required: true,
      unique: true, 
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    discount: {
      type: Number,
      required: true,
      min: 0, // Discount cannot be negative
      max: 100, // Discount cannot exceed 100%
    },
    minimumPurchase: {
      type: Number,
      required: true,
      min: 0, // Minimum purchase cannot be negative
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return value > this.startDate;
        },
        message: "End date must be later than start date.",
      },
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"], // Limits status to these two options
      default: "Active",
    },
  },
  
  {
    timestamps: true, // Automatically adds `createdAt` and `updatedAt` fields
  }
);


module.exports = mongoose.model("Coupon", couponSchema);

