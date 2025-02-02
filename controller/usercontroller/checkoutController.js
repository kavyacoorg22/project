const mongoose = require('mongoose');
const signupModel = require('../../model/userModel/signupModel');
const cartModel = require('../../model/userModel/cartModel');
const orderModel = require('../../model/userModel/orderModel');
const productModel = require('../../model/adminModel/productModel');
const walletModel=require('../../model/userModel/walletModel')
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const loadCheckout = async (req, res) => {
    try {
        const userId = req.user._id;
        
        const user = await signupModel
            .findById(userId)
            .populate('address')
            .exec();
        
        if (!user) {
            return res.status(404).render('error', { 
                message: 'User not found',
                error: { status: 404 }
            });
        }

        const cart = await cartModel
            .findOne({ user: userId })
            .populate({
                path: 'product.product',
                select: 'name description price images quantity'
            });

        if (!cart || !cart.product || cart.product.length === 0) {
           
            return res.redirect('/user/cart');
        }

        const validProducts = cart.product.filter(item => 
            item.product != null && item.product.quantity >= item.quantity
        );

        if (validProducts.length !== cart.product.length) {
            req.flash('warning', 'Some items in your cart are no longer available');
        }
        
        const cartTotal = validProducts.reduce((sum, item) => 
            sum + (item.product.price * item.quantity), 0);
        const deliveryCharge = cartTotal > 1000 ? 0 : 40;
        const discount = cart.discountAmount;
        const finalTotal = cartTotal + deliveryCharge - discount;

        res.render('user/checkout', {
            title: 'Checkout',
            currentPage: 'Checkout',
            includeCss: true,
            csspage: 'checkout.css',
            addresses: user.address || [],
            cartTotal,
            deliveryCharge,
            discount,
            finalTotal,
            user,
            products: validProducts
        });

    } catch (err) {
        console.error('Checkout page error:', err);
        res.status(500).render('error', { 
            message: 'Error loading checkout page',
            error: err 
        });
    }
};




const loadSuccessPage = async (req, res) => {
    try {
        const orderId = req.params.id;
        
        
        // Fetch order details
        const orderDetails = await orderModel.findById(orderId)

            

        if (!orderDetails) {
            return res.redirect('/user/order');
        }

        res.render('user/orderSuccess', {
            title: 'Order Success',
            includeCss: true,
            csspage: 'orderSuccess.css',
            
        });

    } catch (err) {
        console.error('Error loading success page:', err);
        res.redirect('/user/orders');
    }
};


const checkWalletBalance = async (req, res) => {
    try {
        const userId = req.user._id;
        const wallet = await walletModel.findOne({ user: userId });
        
        if (!wallet) {
            return res.json({ success: false, balance: 0 });
        }

        res.json({
            success: true,
            balance: wallet.balance
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error checking balance' });
    }
};

const placeOrder = async (req, res) => {
    try {
        const { addressId, paymentMethod, billing } = req.body;
        const userId = req.user._id;

        if (!addressId || !billing) {
            throw new Error('Missing required fields');
        }

        const user = await signupModel.findById(userId);
            
        if (!user || !user.address.includes(addressId)) {
            throw new Error('Invalid delivery address');
        }

        const cart = await cartModel
            .findOne({ user: userId })
            .populate('product.product');

        if (!cart || !cart.product.length) {
            throw new Error('Cart is empty');
        }

        const orderedItem = [];
        let cartTotal = 0;

        for (const item of cart.product) {
            if (!item.product || item.quantity > item.product.quantity) {
                throw new Error(`Insufficient stock for ${item.product?.name || 'a product'}`);
            }
            orderedItem.push({
                product: item.product._id,
                quantity: item.quantity,
                price: item.product.price,
                name: item.product.name,
                firstImage: item.product.images[0],
                status: 'processing'
            });
            cartTotal += item.product.price * item.quantity;
        }

        const deliveryCharge = cartTotal > 1000 ? 0 : 40;
        const discount = 0;
        const finalAmount = cartTotal + deliveryCharge - discount;

        // Check wallet balance if payment method is wallet
        if (paymentMethod === 'wallet') {
            const wallet = await walletModel.findOne({ user: userId });
            
            if (!wallet || wallet.balance < finalAmount) {
                throw new Error('Insufficient wallet balance');
            }

            // Deduct amount from wallet
            await walletModel.findOneAndUpdate(
                { user: userId },
                {
                    $inc: { balance: -finalAmount },
                    $push: {
                        transactions: {
                            transactionType: 'withdrawal',
                            amount: finalAmount,
                            date: new Date()
                        }
                    }
                },
                { new: true }
            );
        }

        const orderID = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;
        
        // Create order in your database
        const order = await orderModel.create({
            orderID,
            user: userId,
            deliveryAddress: addressId,
            billingDetails: billing,
            orderedItem,
            totalAmount: finalAmount,
            deliveryCharge,
            discount,
            paymentMethod: paymentMethod || 'cod',
            status: paymentMethod === 'wallet' ? 'processing' : 'Payment Pending',
            orderDate: new Date()
        });

        // If payment method is Razorpay, create Razorpay order
        if (paymentMethod === 'razorpay') {
            try {
                const razorpayOrder = await razorpay.orders.create({
                    amount: finalAmount * 100, // Convert to paise
                    currency: 'INR',
                    receipt: orderID,
                    notes: {
                        orderId: order._id.toString()
                    }
                });

                // Return Razorpay order details along with success response
                return res.json({
                    success: true,
                    orderId: order._id,
                    razorpay: {
                        orderID: razorpayOrder.id,
                        amount: razorpayOrder.amount,
                        currency: razorpayOrder.currency,
                        key: process.env.RAZORPAY_KEY_ID
                    }
                });
            } catch (error) {
                // If Razorpay order creation fails, delete the order from your database
                await orderModel.findByIdAndDelete(order._id);
                throw new Error('Failed to create Razorpay order');
            }
        }

        // For non-Razorpay payments, continue with the existing flow
        await Promise.all(
            orderedItem.map(async (item) => {
                const updatedProduct = await productModel.findByIdAndUpdate(
                    item.product,
                    { $inc: { quantity: -item.quantity } },
                    { new: true } 
                );
          
                return productModel.findByIdAndUpdate(
                    item.product,
                    { $set: { stock: updatedProduct.quantity } },
                    { new: true } 
                );
            })
        );

        await cartModel.findOneAndDelete({ user: userId });

        res.json({ 
            success: true, 
            orderId: order._id,
            message: 'Order placed successfully' 
        });

    } catch (error) {
        console.error('Error placing order:', error);
        res.status(400).json({ 
            success: false, 
            message: error.message || 'Error placing order. Please try again.' 
        });
    }
};

// Add this new function to verify Razorpay payments
const verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;
        

        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });
        // Verify signature
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            // Get Razorpay order details
            const razorpayOrder = await razorpay.orders.fetch(razorpay_order_id);
            
            // Find and update order in your database
            const order = await orderModel.findOne({ orderID: razorpayOrder.receipt });
            
            if (!order) {
                throw new Error('Order not found');
            }

            // Update order status
            order.status = 'processing';
            order.orderedItem = order.orderedItem.map(item => ({
                ...item.toObject(),
                status: 'processing'
            }));

            await order.save();

            // Update product quantities
            await Promise.all(
                order.orderedItem.map(async (item) => {
                    const updatedProduct = await productModel.findByIdAndUpdate(
                        item.product,
                        { $inc: { quantity: -item.quantity } },
                        { new: true } 
                    );
              
                    return productModel.findByIdAndUpdate(
                        item.product,
                        { $set: { stock: updatedProduct.quantity } },
                        { new: true } 
                    );
                })
            );

            // Clear cart
            await cartModel.findOneAndDelete({ user: order.user });

            res.json({
                success: true,
                message: 'Payment verified and order confirmed'
            });
        } else {
            throw new Error('Invalid payment signature');
        }
    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Payment verification failed'
        });
    }
};



module.exports = {
    loadCheckout,
    placeOrder,
    loadSuccessPage,checkWalletBalance,verifyPayment
};