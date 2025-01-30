const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
 
  productCategory: {
    type: String,
    required: true,
    enum: ['category', 'product'],
  },
  productCategoryID: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
    maxlength: 50, // Adjust the length as needed
  },
  description: {
    type: String,
    required: true,
    maxlength: 100, // Adjust based on the application's requirement
  },
  offer: {
    type: Number,
    required: true,
    min: 0, // Ensures a non-negative value
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
        return value > this.startDate; // Ensures endDate is after startDate
      },
      message: 'End date must be after the start date.',
    },
  },
  status: {
    type: String,
    required: true,
    enum: ['Active', 'Inactive', 'Expired'], // Define valid statuses
  },
}, { timestamps: true }); 

const Offer = mongoose.model('offer', offerSchema);

module.exports = Offer;