const mongoose = require('mongoose');


const orderSchema = new mongoose.Schema({
    orderID:{
        type:String,
        unique: true,
        required: true
    },
   user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    deliveryAddress: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'address',
        required: true
    },
    billingDetails: {
        type: Object,
        required: true
    },
    orderedItem: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'product',
                required: true
            },
            quantity: {
                type: Number,
                required: true
            },
            price: {
                type: Number,
                required: true
            },
            name: {
                type: String,
                required: true,
              },
              firstImage: {
                type: String,
                required: true,
              },
              status: {
                type: String,
                required: true,
                enum: [
                  "Payment Pending",
                  "processing",
                  "shipped",
                  "Delivered",
                  "Canceled",
                  "Cancel Request",
                  "Return Request",
                  "Returned",
                ],
                default:"processing",
              },
              returnReason:{
                type:String,
                default:null
              },
              cancelReason:{
                type:String,
                default:null
              }
      
      
      
        }
    ],
    totalAmount: {
        type: Number,
        required: true
    },
    deliveryCharge: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 0
    },
    paymentMethod: {
        type: String,
        enum: ['cod', 'razorpay', 'wallet'],
        default: 'cod',
        required: true
    },
    status: {
        type: String,
        enum: [ "Payment Pending","processing","shipped","delivered","canceled","returned","return request","cancel request"],
        default: 'processing'
    },
    orderDate: {
        type: Date,
        default: Date.now
    },couponCode: {
        type: String,
        default: null
    }
   
}, { timestamps: true });





module.exports = mongoose.model('order',orderSchema);
