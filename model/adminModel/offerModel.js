const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
 
  productCategory: {
    type: String,
    required: true,
    enum: ['category', 'product'],
  },
  productCategoryID: {
    type: mongoose.Schema.Types.ObjectId,
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
   
  },
  status: {
    type: String,
    required: true,
    enum: ['Active', 'Inactive'] // Define valid statuses
  },
}, { timestamps: true }); 



module.exports = mongoose.model('offer',offerSchema);