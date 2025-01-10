const mongoose = require('mongoose');

const signupSchema = new mongoose.Schema({
  firstname: {
    type: String,
    required: true
  },
  lastname: {
    type: String,
    required: true
  },
  number: {
    type: Number,
    required: function() {
      return !this.googleId; // Only required for non-Google users
    }
  },
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId; // Only required for non-Google users
    }
  },
  confirmPassword: {
    type: String,
    required: function() {
      return !this.googleId; // Only required for non-Google users
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  googleId: String,
  picture: String
});

module.exports = mongoose.model('signup', signupSchema);