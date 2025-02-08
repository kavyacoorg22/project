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

        if (validProducts.length !== cart.product.length) {
            req.flash('warning', 'Some items in your cart are no longer available');
        }
        
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
        //cod and wallet
        if (paymentMethod === "cod" || paymentMethod === "wallet") {
            try {
                await Promise.all(
                    orderedItem.map(async (item) => {
                
                        const product = await productModel.findById(item.product);
        
                        if (!product) {
                            throw new Error(`Product not found: ${item.name}`);
                        }
        
                        // Calculate new quantity
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
        console.error('Payment verification error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Payment verification failed'
        });
    }
};


// const retryPayment = async (req, res) => {
//     try {
//         const { orderID, productID } = req.body;
//         console.log('Retry payment request received:', { orderID, productID });

//         // Find order
//         console.log('Finding order...');
//         const order = await orderModel.findOne({ orderID })
//             .populate('orderedItem.product');
//         console.log('Order found:', order ? 'yes' : 'no');

//         if (!order) {
//             return res.status(404).json({ 
//                 success: false, 
//                 message: 'Order not found' 
//             });
//         }

//         // Find product
//         console.log('Finding product in order...');
//         const productItem = order.orderedItem.find(
//             item => item.product._id.toString() === productID
//         );
//         console.log('Product found:', productItem ? 'yes' : 'no');

//         if (!productItem) {
//             return res.status(404).json({ 
//                 success: false, 
//                 message: 'Product not found in order' 
//             });
//         }

//         if (productItem.status !== 'Payment Pending') {
//             return res.status(400).json({
//                 success: false,
//                 message: `Cannot retry payment for product in ${productItem.status} status`
//             });
//         }

//         // Calculate amount here, before using it
//         const amount = Math.round(productItem.product.price * productItem.quantity * 100);
//         console.log('Calculated amount:', amount);

//         // Create receipt
//         const receipt = `rcpt_${orderID.slice(-6)}_${productID.slice(-4)}`;

//         // Create Razorpay order
//         console.log('Creating Razorpay order...');
//         const razorpay = new Razorpay({
//             key_id: process.env.RAZORPAY_KEY_ID,
//             key_secret: process.env.RAZORPAY_KEY_SECRET
//         });

//         const razorpayOrder = await razorpay.orders.create({
//             amount,
//             currency: 'INR',
//             receipt: receipt,
//             notes: {
//                 orderID: order._id.toString(),
//                 productID,
//                 quantity: productItem.quantity
//             }
//         });
//         console.log('Razorpay order created:', razorpayOrder.id);
        
//         return res.json({
//             success: true,
//             orderID,
//             productID,
//             productName: productItem.product.name,
//             razorpay: {
//                 orderID: razorpayOrder.id,
//                 amount: razorpayOrder.amount,
//                 currency: razorpayOrder.currency,
//                 key: process.env.RAZORPAY_KEY_ID
//             }
//         });

//     } catch (error) {
//         console.error('Detailed error in retryPayment:', error);
//         return res.status(500).json({ 
//             success: false, 
//             message: 'Internal server error while processing payment',
//             error: error.message
//         });
//     }
// };


const retryPayment = async (req, res) => {
    try {
        const { orderID, productID } = req.body;
        console.log('Retry payment request received:', { orderID, productID });

        // Find order
        console.log('Finding order...');
        const order = await orderModel.findOne({ orderID })
            .populate('orderedItem.product');
        console.log('Order found:', order ? 'yes' : 'no');

        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: 'Order not found' 
            });
        }

        // Find product
        console.log('Finding product in order...');
        const productItem = order.orderedItem.find(
            item => item.product._id.toString() === productID
        );
        console.log('Product found:', productItem ? 'yes' : 'no');

        if (!productItem) {
            return res.status(404).json({ 
                success: false, 
                message: 'Product not found in order' 
            });
        }

        // Calculate amount
        const amount = Math.round(productItem.product.price * productItem.quantity * 100);
        console.log('Calculated amount:', amount);

        // Create receipt
        const receipt = `rcpt_${orderID.slice(-6)}_${productID.slice(-4)}`;

        // Create Razorpay order
        console.log('Creating Razorpay order...');
        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });

        const razorpayOrder = await razorpay.orders.create({
            amount,
            currency: 'INR',
            receipt: receipt,
            notes: {
                orderID: order._id.toString(),
                productID,
                quantity: productItem.quantity
            }
        });
        console.log('Razorpay order created:', razorpayOrder.id);

        // Log the response data being sent
        const responseData = {
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
        };
        console.log('Sending response to client:', responseData);

        return res.json(responseData);

    } catch (error) {
        console.error('Detailed error in retryPayment:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal server error while processing payment',
            error: error.message
        });
    }
};

const verifyReturnPayment = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        console.log("Verify payment request received:", req.body);
        const { orderID, productID, paymentResponse } = req.body;
        
        if (!paymentResponse?.razorpay_order_id) {
            throw new Error('Missing razorpay_order_id');
        }
        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });
        // Input Validation
        if (!orderID || !productID || !paymentResponse) {
            return res.status(400).json({
                success: false,
                message: 'Missing required payment parameters'
            });
        }

        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature 
        } = paymentResponse;

        // Razorpay Signature Verification
        const validationResult = await razorpay.payments.validate({
            order_id: razorpay_order_id,
            payment_id: razorpay_payment_id,
            signature: razorpay_signature
        });

        if (!validationResult) {
            return res.status(400).json({
                success: false,
                message: 'Payment signature validation failed'
            });
        }

        // Find Order and Update
        const order = await orderModel.findOne({ orderID }).session(session);
        const productItem = order.orderedItem.find(
            item => item.product.toString() === productID
        );

        productItem.status = 'processing';
        await order.save({ session });

        await session.commitTransaction();

        return res.json({
            success: true,
            message: 'Payment verified successfully'
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Payment Verification Error:', error);
        
        return res.status(500).json({
            success: false,
            message: 'Payment verification failed'
        });
    } finally {
        session.endSession();
    }
};




module.exports = {
    loadCheckout,
    placeOrder,
    loadSuccessPage,checkWalletBalance,verifyPayment,retryPayment,verifyReturnPayment
};