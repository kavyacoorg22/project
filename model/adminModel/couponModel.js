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
      min: 0, 
      max: 100, 
    },
    minimumPurchase: {
      type: Number,
      required: true,
      min: 0, 
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
      enum: ["Active", "Inactive"], 
      default: "Active",
    },
  },
  
  {
    timestamps: true, 
  }
);


module.exports = mongoose.model("Coupon", couponSchema);

