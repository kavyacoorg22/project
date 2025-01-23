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
            paymentMethod: paymentMethod || 'cod',
            status: 'processing',
            orderDate: new Date()
        });

        await Promise.all(orderedItem.map(item =>
            productModel.findByIdAndUpdate(
                item.product,
                { $inc: { quantity: -item.quantity } }
            )
        ));

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

module.exports = {
    loadCheckout,
    placeOrder,
    loadSuccessPage
};