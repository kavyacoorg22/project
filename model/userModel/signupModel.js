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
      return !this.googleId; 
    }
  },
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId; 
    }
  },

  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  secondEmail:
  {
    type:String,
  },
  googleId: String,
  picture: String,
 
  address:[{
     type: mongoose.Schema.Types.ObjectId,
        ref: 'address',
  }]
},{timestamps:true});

module.exports = mongoose.model('users', signupSchema);