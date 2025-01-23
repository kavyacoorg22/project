const mongoose = require('mongoose');


const orderSchema = new mongoose.Schema({
    orderID:{
        type:String,
        unique: true,
        required: true
    },
   user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'signup',
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
    products: [
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
        enum: ['cod', 'online', 'wallet'],
        default: 'cod',
        required: true
    },
    status: {
        type: String,
        enum: [ "Payment Pending","pending","processing","shipped","delivered","cancel","return","returned"],
        default: 'pending'
    },
    orderDate: {
        type: Date,
        default: Date.now
    },
}, { timestamps: true });





module.exports = mongoose.model('order',orderSchema);
