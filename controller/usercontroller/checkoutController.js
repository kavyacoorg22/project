const mongoose = require('mongoose');
const signupModel = require('../../model/userModel/signupModel');
const cartModel = require('../../model/userModel/cartModel');
const orderModel = require('../../model/userModel/orderModel');
const productModel = require('../../model/adminModel/productModel');
const walletModel=require('../../model/userModel/walletModel')
const Razorpay = require('razorpay');
const crypto = require('crypto');


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
        const { id } = req.params;
         console.log(id)
        const order = await orderModel.findOne({ orderID:id });
        console.log(order)
        if (!order) {
            return res.send("order not found")
        }

    
        res.render('user/orderSuccess', {
            title: 'Order Success',
            includeCss: true,
            csspage: 'orderSuccess.css',
            
        });
    } catch (error) {
        console.error('Error loading success page:', error);
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
        console.log(`Starting order placement - Payment Method: ${paymentMethod}`);

        // Validate required fields
        if (!addressId || !billing) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }

        // Validate user and address
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

        // Get user's cart and validate
        const cart = await cartModel
            .findOne({ user: userId })
            .populate('product.product');

         
            console.log("Cart data:", JSON.stringify({
                exists: !!cart,
                productCount: cart?.product?.length || 0,
                products: cart?.product?.map(p => ({
                    id: p.product?._id,
                    name: p.product?.name,
                    quantity: p.quantity
                }))
            }, null, 2));

        if (!cart || !cart.product.length) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cart is empty' 
            });
        }

        // Prepare ordered items and calculate total
        const orderedItem = [];
        let cartTotal = 0;

        for (const item of cart.product) {
            // Validate product availability
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

            orderedItem.push({
                product: item.product._id,
                quantity: item.quantity,
                price: item.product.price,
                name: item.product.name,
                firstImage: item.product.images[0],
                status: paymentMethod === 'razorpay' ? 'Payment Pending' : 'processing'
            });

            cartTotal += item.product.price * item.quantity;
        }

        // Calculate charges and final amount
        const deliveryCharge = cartTotal > 1000 ? 0 : 40;
        const discount = 0;
        const finalAmount = cartTotal + deliveryCharge - discount;

        // Handle wallet payment
        if (paymentMethod === 'wallet') {
            const wallet = await walletModel.findOne({ user: userId });
            
            if (!wallet || wallet.balance < finalAmount) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Insufficient wallet balance' 
                });
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

        // Generate unique orderID
        const orderID = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;
        
        // Create order
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
            orderDate: new Date()
        });

        // Handle Razorpay payment
        if (paymentMethod === 'razorpay') {
            try {
                const razorpayOrder = await razorpay.orders.create({
                    amount: finalAmount * 100, // Convert to paise
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

        // Update product stock for COD and wallet payments
        if (paymentMethod === 'cod' || paymentMethod === 'wallet') {
            try {
                await Promise.all(
                    orderedItem.map(async (item) => {
                        // Fetch the full product
                        const product = await productModel.findById(item.product);
                        
                        if (!product) {
                            throw new Error(`Product not found: ${item.name}`);
                        }

                        // Calculate new quantity
                        const currentQuantity = Number(product.quantity) || 0;
                        const newQuantity = Math.max(0, currentQuantity - item.quantity);

                        // Update product quantity
                        await productModel.findByIdAndUpdate(
                            item.product,
                            { 
                                $set: { 
                                    quantity: newQuantity,
                                    stock: newQuantity 
                                }
                            },
                            { new: true }
                        );
                    })
                );
            } catch (stockError) {
                // Rollback order if stock update fails
                await orderModel.findOneAndDelete({ orderID });
                return res.status(500).json({ 
                    success: false, 
                    message: stockError.message || 'Error updating product stock' 
                });
            }
        }

        // Clear user's cart
        await cartModel.findOneAndDelete({ user: userId });

        // Send success response
        res.json({ 
            success: true, 
            orderID,
            message: 'Order placed successfully' 
        });

    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Internal server error. Please try again.' 
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




// const retryPayment = async (req, res) => {
//     try {
//         const { orderID, productID } = req.body; // Receive productID
//         if (!orderID || !productID) {
//             throw new Error('Missing orderID or productID');
//         }

//         const razorpay = new Razorpay({
//             key_id: process.env.RAZORPAY_KEY_ID,
//             key_secret: process.env.RAZORPAY_KEY_SECRET
//         });

//         // Find order and product in it
//         const order = await orderModel.findOne({ orderID });
//         if (!order) {
//             throw new Error('Order not found');
//         }

//         const productItem = order.orderedItem.find(item => item.product.toString() === productID);
//         if (!productItem) {
//             throw new Error('Product not found in order');
//         }

//         if (productItem.status === 'processing') {
//             return res.json({ success: false, message: 'Product is already being processed' });
//         }

//         // Create Razorpay Order
//         let razorpayOrder;
//         try {
//             razorpayOrder = await razorpay.orders.create({
//                 amount: productItem.price * productItem.quantity * 100,
//                 currency: 'INR',
//                 receipt: order.orderID + '-' + productID, 
//                 notes: { orderId: order._id.toString(), productId: productID }
//             });
//         } catch (err) {
//             console.error('Error creating Razorpay order:', err);
//             return res.status(500).json({ success: false, message: 'Failed to create Razorpay order' });
//         }

//         res.json({
//             success: true,
//             orderID,
//             productID,
//             razorpay: {
//                 orderID: razorpayOrder.id,
//                 amount: razorpayOrder.amount,
//                 currency: razorpayOrder.currency,
//                 key: process.env.RAZORPAY_KEY_ID
//             }
//         });

//     } catch (error) {
//         console.error('Error in retry-payment:', error);
//         res.status(400).json({
//             success: false,
//             message: error.message || 'Failed to retry payment'
//         });
//     }
// };

  
  
// const verifyreturnPayment = async (req, res) => {
//     try {
//         const { orderID, productID, paymentResponse } = req.body;
//         const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentResponse;
        
//         const razorpay = new Razorpay({
//             key_id: process.env.RAZORPAY_KEY_ID,
//             key_secret: process.env.RAZORPAY_KEY_SECRET
//         });

//         // Verify Signature
//         const body = razorpay_order_id + '|' + razorpay_payment_id;
//         const expectedSignature = crypto
//             .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
//             .update(body)
//             .digest('hex');

//         if (expectedSignature !== razorpay_signature) {
//             return res.json({ success: false, message: 'Payment verification failed' });
//         }

//         // Find Order
//         const order = await orderModel.findOne({ _id: orderID });
//         if (!order) {
//             return res.json({ success: false, message: 'Order not found' });
//         }

//         // Find Product in Order
//         const productItem = order.orderedItem.find(item => item.product.toString() === productID);
//         if (!productItem) {
//             return res.json({ success: false, message: 'Product not found in order' });
//         }

//         // ✅ Update only this product's status
//         productItem.status = "processing";

//         // ✅ Update Stock for this Product
//         await productModel.findByIdAndUpdate(
//             productID,
//             { $inc: { quantity: -productItem.quantity } }, 
//             { new: true }
//         );

//         await order.save();

//         res.json({ success: true, message: 'Payment verified, product is processing' });
//     } catch (error) {
//         console.error('Payment verification error:', error);
//         res.json({ success: false, message: 'Payment verification failed' });
//     }
// };


const retryPayment = async (req, res) => {
    try {
        console.log('✅ Entered retryPayment route'); // Debugging Log
        console.log('📥 Request Body:', req.body);

        const { orderID, productID } = req.body;
        if (!orderID || !productID) {
            console.log('❌ Missing orderID or productID');
            return res.status(400).json({ success: false, message: 'Missing orderID or productID' });
        }

        console.log('🔍 Fetching Order:', orderID);
        const order = await orderModel.findOne({ orderID }).populate('orderedItem.product');
        if (!order) {
            console.log('❌ Order not found');
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const productItem = order.orderedItem.find(item => item.product._id.toString() === productID);
        if (!productItem) {
            console.log('❌ Product not found in order');
            return res.status(404).json({ success: false, message: 'Product not found in order' });
        }

        if (productItem.status !== 'Payment Pending') {
            console.log(`⚠️ Cannot retry payment for product in ${productItem.status} status`);
            return res.status(400).json({
                success: false,
                message: `Cannot retry payment for product in ${productItem.status} status`
            });
        }

        console.log('🔍 Verifying Product Stock:', productID);
        const product = await productModel.findById(productID);
        if (!product || product.quantity < productItem.quantity) {
            console.log('❌ Product out of stock');
            return res.status(400).json({ success: false, message: 'Product out of stock' });
        }

        console.log('🧾 Generating Receipt ID');
        const receipt = `${orderID.slice(-6)}-${productID.slice(-4)}`;

        console.log('🔑 Initializing Razorpay');
        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });

        console.log('💰 Creating Razorpay Order');
        const razorpayOrder = await razorpay.orders.create({
            amount: Math.round(productItem.price * productItem.quantity * 100), // Convert to paise
            currency: 'INR',
            receipt: receipt,
            notes: {
                orderID: order._id.toString(),
                productID: productID,
                quantity: productItem.quantity.toString()
            }
        });

        console.log('✅ Razorpay Order Created:', razorpayOrder.id);




console.log('🚀 Sending response to frontend:', {
    success: true,
    orderID,
    productID,
    productName: productItem.product.name,
    razorpay: {
        orderID: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key: process.env.RAZORPAY_KEY_ID
    }
});
        return res.json({
            success: true,
            orderID,
            productID,
            productName: productItem.product.name, // Ensure correct field
            razorpay: {
                orderID: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                key: process.env.RAZORPAY_KEY_ID
            }
        });

    } catch (error) {
        console.error('🔥 Error in retry-payment:', error);
        return res.status(500).json({ success: false, message: 'Internal server error while processing payment' });
    }
};

const verifyReturnPayment = async (req, res) => {
    try {
        const { orderID, productID, paymentResponse } = req.body;
        if (!orderID || !productID || !paymentResponse) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters'
            });
        }

        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentResponse;
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment response'
            });
        }

        // Verify Signature
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: 'Payment signature verification failed'
            });
        }

        // Use session/transaction for atomicity
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Find and update order
            const order = await orderModel.findOne({ orderID }).session(session);
            if (!order) {
                throw new Error('Order not found');
            }

            const productItem = order.orderedItem.find(item => item.product.toString() === productID);
            if (!productItem) {
                throw new Error('Product not found in order');
            }

            if (productItem.status !== 'Payment Pending') {
                throw new Error(`Invalid product status: ${productItem.status}`);
            }

            // Update product status
            productItem.status = 'processing';

            // Update product stock
            const product = await productModel.findById(productID).session(session);
            if (!product || product.quantity < productItem.quantity) {
                throw new Error('Product out of stock');
            }

            await productModel.findByIdAndUpdate(
                productID,
                { $inc: { quantity: -productItem.quantity } },
                { session, new: true }
            );

            // Save order changes
            await order.save({ session });

            // Commit transaction
            await session.commitTransaction();
            
            return res.json({
                success: true,
                message: 'Payment verified and product status updated to processing'
            });

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }

    } catch (error) {
        console.error('Payment verification error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Payment verification failed'
        });
    }
};




module.exports = {
    loadCheckout,
    placeOrder,
    loadSuccessPage,checkWalletBalance,verifyPayment,retryPayment,verifyReturnPayment
};