const cartModel = require('../../model/userModel/cartModel');
const productModel = require('../../model/adminModel/productModel');
const couponModel=require('../../model/adminModel/couponModel')
const { calculateDiscount } = require('../../utils/calculateDiscount');



const loadCart = async (req, res) => {
  try {
      const userId = req.user._id;
      const coupons = await couponModel.find({
          status: "Active",
          endDate: { $gt: new Date() }
      });

      const cart = await cartModel
          .findOne({ user: userId })
          .populate({
              path: 'product.product',
              populate: [
                {
                  path: 'offers',
                  match: {
                    status: 'Active',
                    startDate: { $lte: new Date() },
                    endDate: { $gte: new Date() }
                  }
                },
                {
                  path: 'category',
                  populate: {
                    path: 'offers',
                    match: {
                      status: 'Active',
                      startDate: { $lte: new Date() },
                      endDate: { $gte: new Date() }
                    }
                  }
                }
              ]
          })
          .populate('appliedCoupon');

      if (!cart) {
          return res.render('user/cart', {
              title: 'Cart',
              includeCss: true,
              csspage: "coupon.css",
              products: [],
              totalPrice: 0,
              discountAmount: 0,
              finalAmount: 0,
              coupons
          });
      }

    
      const validProducts = cart.product.filter(item => item.product != null).map(item => {
       
          const discountInfo = calculateDiscount(item.product);
          
    
          const price = discountInfo.hasDiscount ? discountInfo.discountedPrice : item.product.price;
          
          return {
              ...item.toObject(),
              price: price,
              hasDiscount: discountInfo.hasDiscount,
              totalDiscount: discountInfo.totalDiscount,
              originalPrice: item.product.price
          };
      });
      
      // Calculate total price
      const totalPrice = validProducts.reduce((total, item) => 
          total + (item.price * item.quantity), 0);

      res.render('user/cart', {
          title: 'Cart',
          includeCss: true,
          csspage: "coupon.css",
          products: validProducts,
          totalPrice: totalPrice,
          discountAmount: cart.discountAmount || 0,
          finalAmount: cart.finalAmount || totalPrice,
          appliedCoupon: cart.appliedCoupon,
          coupons,
      });
  } catch (err) {
    
      res.status(500).render('error', { message: 'Error loading cart' });
  }
};



const addToCart = async (req, res) => {
  try {
      const { productId, quantity = 1 } = req.body;
      const userId = req.user._id;

      if(!userId)
      {
        return res.status(400).json({
          sucess:false,
          requiresLogin: true,
          message:"please login to continue"
        })
      }

      if (!productId || quantity < 1) {
          return res.status(400).json({ 
              success: false, 
              message: 'Invalid product ID or quantity' 
          });
      }

      const product = await productModel.findById(productId);
      if (!product) {
          return res.status(404).json({ 
              success: false, 
              message: 'Product not found' 
          });
      }

      if (!product.quantity || product.quantity < quantity) {
          return res.status(400).json({ 
              success: false, 
              message: 'Insufficient stock',
              availableStock: product.quantity 
          });
      }

      // Calculate discount information
      const discountInfo = calculateDiscount(product);
      const discountedPrice = discountInfo.hasDiscount 
          ? discountInfo.discountedPrice 
          : product.price;

      let cart = await cartModel.findOne({ user: userId });
      
      if (!cart) {
          cart = new cartModel({
              user: userId,
              product: [{ 
                  product: productId, 
                  quantity, 
                  price: discountedPrice 
              }]
          });
      } else {
          const existingProductIndex = cart.product.findIndex(
              item => item.product.toString() === productId
          );

          if (existingProductIndex !== -1) {
              const newQuantity = cart.product[existingProductIndex].quantity + quantity;
              if (newQuantity > product.quantity) {
                  return res.status(400).json({ 
                      success: false, 
                      message: 'Total quantity would exceed available stock',
                      availableStock: product.quantity 
                  });
              }
              cart.product[existingProductIndex].quantity = newQuantity;
              cart.product[existingProductIndex].price = discountedPrice;
          } else {
              cart.product.push({ 
                  product: productId, 
                  quantity,
                  price: discountedPrice 
              });
          }
      }

      //
      cart = await updateCartTotals(cart);
      await cart.save();

      res.json({ 
          success: true, 
          cartCount: cart.product.length,
          message: 'Product added to cart successfully'
      });
  } catch (err) {
      
   
      
      res.status(500).json({ 
          success: false, 
          message: err.message || 'Error adding product to cart' 
      });
  }
  };

const updateQuantity = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user._id;

    // Validate inputs
    if (!productId || quantity < 1) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid product ID or quantity' 
      });
    }

    // Check product stock
    const product = await productModel.findById(productId);
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }

    if (quantity > product.quantity) {
      return res.status(400).json({ 
        success: false, 
        message: 'Requested quantity exceeds available stock',
        availableStock: product.quantity 
      });
    }

    const cart = await cartModel.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cart not found' 
      });
    }

    const productIndex = cart.product.findIndex(
      item => item.product.toString() === productId
    );

    if (productIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found in cart' 
      });
    }

    // Update quantity
    cart.product[productIndex].quantity = quantity;
    cart.totalPrice = await calculateTotalPrice(cart.product);
    await cart.save();

    res.json({ 
      success: true, 
      newTotal: product.price * quantity,
      cartTotal: cart.totalPrice
    });
  } catch (err) {
   
    res.status(500).json({ 
      success: false, 
      message: 'Error updating quantity' 
    });
  }
};

const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user._id;

    // Validate input
    if (!productId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Product ID is required' 
      });
    }

    const cart = await cartModel.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cart not found' 
      });
    }

    // Remove product from cart
    const initialLength = cart.product.length;
    cart.product = cart.product.filter(
      item => item.product.toString() !== productId
    );

    // Check if product was actually removed
    if (cart.product.length === initialLength) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found in cart' 
      });
    }
    
    cart.totalPrice = await calculateTotalPrice(cart.product);
    await cart.save();

    res.json({ 
      success: true,
      message: 'Product removed successfully',
      cartTotal: cart.totalPrice,
      cartCount: cart.product.length
    });
  } catch (err) {

    res.status(500).json({ 
      success: false, 
      message: 'Error removing product from cart' 
    });
  }
};



async function calculateTotalPrice(products) {
  try {
      let total = 0;
      for (const item of products) {
          const product = await productModel.findById(item.product)
              .populate([
                  {
                      path: 'offers',
                      match: {
                          status: 'Active',
                          startDate: { $lte: new Date() },
                          endDate: { $gte: new Date() }
                      }
                  },
                  {
                      path: 'category',
                      populate: {
                          path: 'offers',
                          match: {
                              status: 'Active',
                              startDate: { $lte: new Date() },
                              endDate: { $gte: new Date() }
                          }
                      }
                  }
              ]);

          if (product) {
              // Calculate discount
              const discountInfo = calculateDiscount(product);
              
              // Use discounted price if available
              const price = discountInfo.hasDiscount 
                  ? discountInfo.discountedPrice 
                  : product.price;
              
              total += price * item.quantity;
          }
      }
      return Number(total.toFixed(2)); // Ensure consistent decimal places
  } catch (err) {
      
      throw new Error('Error calculating total price');
  }
}

async function updateCartTotals(cart) {
  try {
    const totalPrice = await calculateTotalPrice(cart.product);
    cart.totalPrice = totalPrice;

  
    if (cart.appliedCoupon) {
        const coupon = await couponModel.findById(cart.appliedCoupon);
        if (coupon && coupon.status === "Active") {
        
            if (totalPrice >= coupon.minimumPurchase) {
                cart.discountAmount = Number(((totalPrice * coupon.discount) / 100).toFixed(2));
                cart.finalAmount = Number((totalPrice - cart.discountAmount).toFixed(2));
            } else {
          
                cart.appliedCoupon = null;
                cart.discountAmount = 0;
                cart.finalAmount = totalPrice;
            }
        } else {
          
            cart.appliedCoupon = null;
            cart.discountAmount = 0;
            cart.finalAmount = totalPrice;
        }
    } else {
        cart.finalAmount =totalPrice;
    }
    
    return cart;
  } catch (err) {
    
    throw new Error('Error updating cart totals');
  }
}


const applyCoupon = async (req, res) => {
  try {
      const { couponCode } = req.body;
      const userId = req.user._id;

      const cart = await cartModel.findOne({ user: userId });
      if (!cart) {
          return res.json({
              success: false,
              message: 'Cart not found'
          });
      }

      const coupon = await couponModel.findOne({
          couponCode: couponCode,
          status: "Active",
          startDate: { $lte: new Date() },
          endDate: { $gt: new Date() }
      });

      if (!coupon) {
          return res.json({
              success: false,
              message: 'Invalid or expired coupon'
          });
      }

      if (cart.totalPrice < coupon.minimumPurchase) {
          return res.json({
              success: false,
              message: `Minimum purchase of ₹${coupon.minimumPurchase} required`
          });
      }

      cart.appliedCoupon = coupon._id;
      cart.couponCode=coupon.couponCode;
      await updateCartTotals(cart);
      await cart.save();

      res.json({
          success: true,
          discountAmount: cart.discountAmount.toFixed(2),
          finalAmount: cart.finalAmount.toFixed(2),
          message: 'Coupon applied successfully'
      });

  } catch (error) {
      
      res.status(500).json({
          success: false,
          message: 'Error applying coupon'
      });
  }
};
const removeCoupon = async (req, res) => {
  try {
    const userId = req.user._id;

    const cart = await cartModel.findOne({ user: userId });
    if (!cart) {
      return res.json({
        success: false,
        message: 'Cart not found'
      });
    }

    // Remove coupon from cart
    cart.appliedCoupon = null;
    cart.couponCode = null;
    cart.discountAmount = 0;
    
    // Recalculate cart totals without coupon
    await updateCartTotals(cart);
    await cart.save();

    res.json({
      success: true,
      message: 'Coupon removed successfully',
      finalAmount: cart.finalAmount.toFixed(2)
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Error removing coupon'
    });
  }
};
module.exports = {
  loadCart,
  addToCart,
  updateQuantity,
  removeFromCart,
  applyCoupon,
  removeCoupon
};