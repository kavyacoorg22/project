const mongoose = require('mongoose');
const signupModel = require('../../model/userModel/signupModel');
const cartModel = require('../../model/userModel/cartModel');
const orderModel = require('../../model/userModel/orderModel');
const productModel = require('../../model/adminModel/productModel');

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
            req.flash('error', 'Your cart is empty');
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
        const discount = 0;
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

const placeOrder = async (req, res) => {
    let session;
    try {
        const { addressId, paymentMethod, billing } = req.body;
        const userId = req.user._id;
        session = await mongoose.startSession();
        
        await session.withTransaction(async () => {
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

            const validProducts = [];
            let cartTotal = 0;

            for (const item of cart.product) {
                if (!item.product || item.quantity > item.product.quantity) {
                    throw new Error(`Insufficient stock for ${item.product?.name || 'a product'}`);
                }
                validProducts.push({
                    product: item.product._id,
                    quantity: item.quantity,
                    price: item.product.price
                });
                cartTotal += item.product.price * item.quantity;
            }

            const deliveryCharge = cartTotal > 1000 ? 0 : 40;
            const discount = 0;
            const finalAmount = cartTotal + deliveryCharge - discount;

            const order = await orderModel.create([{
                user: userId,
                deliveryAddress: addressId,
                billingDetails: billing,
                products: validProducts,
                totalAmount: finalAmount,
                deliveryCharge,
                discount,
                paymentMethod: paymentMethod || 'cod',
                status: 'Pending',
                orderDate: new Date()
            }], { session });

            await Promise.all(validProducts.map(item =>
                productModel.findByIdAndUpdate(
                    item.product,
                    { $inc: { quantity: -item.quantity } },
                    { session }
                )
            ));

            await cartModel.findOneAndDelete({ user: userId }, { session });

            await session.commitTransaction();
            
            res.json({ 
                success: true, 
                orderId: order[0]._id,
                message: 'Order placed successfully' 
            });
        });

    } catch (error) {
        if (session) {
            await session.abortTransaction();
        }
        console.error('Error placing order:', error);
        res.status(400).json({ 
            success: false, 
            message: error.message || 'Error placing order. Please try again.' 
        });
    } finally {
        if (session) {
            await session.endSession();
        }
    }
};

module.exports = {
    loadCheckout,
    placeOrder
};