const mongoose = require('mongoose');
const signupModel = require('../../model/userModel/signupModel');
const cartModel = require('../../model/userModel/cartModel');
const orderModel = require('../../model/userModel/orderModel');
const productModel = require('../../model/adminModel/productModel');
const walletModel=require('../../model/userModel/walletModel')
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { calculateDiscount } = require('../../utils/calculateDiscount');

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

     
        const cartTotal=cart.totalPrice;
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
        
        res.status(500).render('error', { 
            message: 'Error loading checkout page',
            error: err 
        });
    }
};



const loadSuccessPage = async (req, res) => {
    try {
        const { id } = req.params;
        
        const order = await orderModel.findOne({ orderID:id });
        
        if (!order) {
            return res.send("order not found")
        }

    
        res.render('user/orderSuccess', {
            title: 'Order Success',
            includeCss: true,
            csspage: 'orderSuccess.css',
            
        });
    } catch (error) {
        
        res.status(500).render('error', { 
            message: 'Error loading order details' 
        });
    }
};


const loadFailedPage = async (req, res) => {
    try {
        const { id } = req.params;
       
        const order = await orderModel.findOne({ orderID:id });
       
        if (!order) {
            return res.send("order not found")
        }

    
        res.render('user/paymentFailed', {
            title: 'Payment Failed',

            csspage: 'paymentFailed.css',
            layout:"./layout/auth-layout"
            
        });
    } catch (error) {
       
        res.status(500).render('error', { 
            message: 'Error loading order details' 
        });
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
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }


        const user = await signupModel.findById(userId);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        if (!user.address.includes(addressId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid delivery address' 
            });
        }

        
        const cart = await cartModel
            .findOne({ user: userId })
            .populate('product.product');

         
           

        if (!cart || !cart.product.length) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cart is empty' 
            });
        }


        const orderedItem = [];
        let cartTotal = 0;

        for (const item of cart.product) {
        
            if (!item.product) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Product not found' 
                });
            }

            if (item.quantity > item.product.quantity) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Insufficient stock for ${item.product.name || 'a product'}` 
                });
            }
            const discountInfo = calculateDiscount(item.product);
             const price = discountInfo.hasDiscount ? discountInfo.discountedPrice : item.product.price;

            orderedItem.push({
                product: item.product._id,
                quantity: item.quantity,
                price:price,
                name: item.product.name,
                firstImage: item.product.images[0],
                status: paymentMethod === 'razorpay' ? 'Payment Pending' : 'processing'
            });

            cartTotal +=item.product.price * item.quantity;
        }


        const deliveryCharge = cartTotal > 500? 0 : 40;
        const discount = cart.discountAmount;
        const finalAmount = cartTotal + deliveryCharge - discount;
        
        if(finalAmount>1000 && paymentMethod==='cod')
         {
            return res.status(400).json({message:"Order above Rs 1000 is not allowed for COD"})
         }

        if (paymentMethod === 'wallet') {
            const wallet = await walletModel.findOne({ user: userId });
            
            if (!wallet || wallet.balance < finalAmount) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Insufficient wallet balance' 
                });
            }


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
        
    
        const order = await orderModel.create({
            orderID,
            user: userId,
            deliveryAddress: addressId,
            billingDetails: billing,
            orderedItem,
            totalAmount: finalAmount,
            deliveryCharge,
            discount,
            paymentMethod,
            status: paymentMethod === 'razorpay' ? 'Payment Pending' : 'processing',
            orderDate: new Date(),
            couponCode: cart.couponCode || null 
        });

        // Handle Razorpay payment
        if (paymentMethod === 'razorpay') {
            try {
                const razorpayOrder = await razorpay.orders.create({
                    amount: finalAmount * 100, 
                    currency: 'INR',
                    receipt: orderID,
                    notes: { orderID }
                });

                // Return Razorpay order details
                return res.json({
                    success: true,
                    orderID,
                    razorpay: {
                        orderID: razorpayOrder.id,
                        amount: razorpayOrder.amount,
                        currency: razorpayOrder.currency,
                        key: process.env.RAZORPAY_KEY_ID
                    }
                });
            } catch (error) {
                // If Razorpay order creation fails, delete the order
                await orderModel.findOneAndDelete({ orderID });
                return res.status(500).json({ 
                    success: false, 
                    message: 'Failed to create Razorpay order' 
                });
            }
        }
        //cod and wallet
        if (paymentMethod === "cod" || paymentMethod === "wallet") {
            try {
                await Promise.all(
                    orderedItem.map(async (item) => {
                
                        const product = await productModel.findById(item.product);
        
                        if (!product) {
                            throw new Error(`Product not found: ${item.name}`);
                        }
        
                        
                        const currentQuantity = Number(product.quantity) || 0;
                        const newQuantity = Math.max(0, currentQuantity - item.quantity);
        
                
                        const newStatus = newQuantity > 0 ? "In Stock" : "Out of Stock";
        
                        // Update product quantity and status
                        await productModel.findByIdAndUpdate(
                            item.product,
                            {
                                $set: {
                                    quantity: newQuantity,
                                    stock: newQuantity,
                                    status: newStatus,
                                },
                            },
                            { new: true }
                        );
                    })
                );
            } catch (stockError) {
                
                await orderModel.findOneAndDelete({ orderID });
                return res.status(500).json({
                    success: false,
                    message: stockError.message || "Error updating product stock",
                });
            }
        }
        

    
        await cartModel.findOneAndDelete({ user: userId });

        res.json({ 
            success: true, 
            orderID,
            message: 'Order placed successfully' 
        });

    } catch (error) {
        
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Internal server error. Please try again.' 
        });
    }
};





const verifyRepayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;
        const userId = req.user._id;

        // Verify signature first
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            throw new Error('Invalid payment signature');
        }

        // Get Razorpay order details
        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });
        
        const razorpayOrder = await razorpay.orders.fetch(razorpay_order_id);
        
        // Get the correct order ID based on whether this is a repayment
        const orderID = razorpayOrder.notes.isRepayment 
            ? razorpayOrder.notes.originalOrderId 
            : razorpayOrder.receipt;

        const order = await orderModel.findOne({ orderID });
        
        if (!order) {
            throw new Error('Order not found');
        }

        // Update order status
        order.status = 'processing';
        order.orderedItem = order.orderedItem.map(item => ({
            ...item.toObject(),
            status: 'processing'
        }));

        // Add payment history for tracking
        order.paymentHistory = order.paymentHistory || [];
        order.paymentHistory.push({
            paymentId: razorpay_payment_id,
            amount: razorpayOrder.amount / 100,
            date: new Date(),
            isRepayment: razorpayOrder.notes.isRepayment || false
        });

        await order.save();

        // Only update product quantities for first-time payments
        if (!razorpayOrder.notes.isRepayment) {
            await updateProductQuantities(order.orderedItem);
        }

        // Clear cart only for first-time payments
        if (!razorpayOrder.notes.isRepayment) {
            await cartModel.findOneAndDelete({ user: userId });
        }

        res.json({
            success: true,
            message: 'Payment verified and order confirmed'
        });
    } catch (error) {
        
        res.status(400).json({
            success: false,
            message: error.message || 'Payment verification failed'
        });
    }
};


const createRazorpayOrder = async ({
    amount,
    orderId,
    isRepayment,
    originalOrderId
}) => {
    try {
        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });
        
        // Always include both IDs in notes
        const notes = {
            orderID: orderId,
            isRepayment: isRepayment,
            originalOrderId: originalOrderId || orderId
        };

        const razorpayOrder = await razorpay.orders.create({
            amount: amount * 100,
            currency: 'INR',
            receipt: orderId,
            notes
        });

        return {
            success: true,
            razorpay: {
                orderID: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                key: process.env.RAZORPAY_KEY_ID
            }
        };
    } catch (error) {
        throw new Error(`Failed to create Razorpay order: ${error.message}`);
    }
};

//  retryPayment
const retryPayment = async (req, res) => {
    try {
        const { orderId } = req.body;
        const userId = req.user._id;

        const order = await orderModel.findOne({ 
            orderID: orderId,
            user: userId,
            status: 'Payment Pending'
        });

        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: 'Order not found or payment not pending' 
            });
        }

        const razorpayResponse = await createRazorpayOrder({
            amount: order.totalAmount,
            orderId: orderId,
            isRepayment: true,
            originalOrderId: orderId
        });

        
        return res.json({
            success: true,
            razorpay: {
                key: razorpayResponse.razorpay.key,
                amount: razorpayResponse.razorpay.amount,
                currency: razorpayResponse.razorpay.currency,
                orderID: razorpayResponse.razorpay.orderID,
            },
            orderDetails: {
                billingDetails: {
                    name: `${order.billingDetails.firstName} ${order.billingDetails.lastName}`,
                    email: order.billingDetails.email,
                    contact: order.billingDetails.phone
                },
                totalAmount: order.totalAmount
            }
        });
    } catch (error) {
       
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Failed to create repayment order' 
        });
    }
};



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

            // Update product quantities and status
            await Promise.all(
                order.orderedItem.map(async (item) => {
                    const updatedProduct = await productModel.findByIdAndUpdate(
                        item.product,
                        { $inc: { quantity: -item.quantity } },
                        { new: true }
                    );
            
                    if (!updatedProduct) return;
            
                  
                    const status = updatedProduct.quantity > 0 ? "In Stock" : "Out of Stock";
            
                    
                    await productModel.findByIdAndUpdate(
                        item.product,
                        { $set: { stock: updatedProduct.quantity, status: status } },
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
       
        res.status(400).json({
            success: false,
            message: error.message || 'Payment verification failed'
        });
    }
};




module.exports = {
    loadCheckout,
    placeOrder,
    loadSuccessPage,checkWalletBalance,verifyRepayment,retryPayment,loadFailedPage,verifyPayment
};