const cartModel = require('../../model/userModel/cartModel');
const productModel = require('../../model/adminModel/productModel');

const loadCart = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find the user's cart and populate the product details
    const cart = await cartModel
      .findOne({ user: userId })
      .populate({
        path: 'product.product',
        select: 'name description price images quantity' // Only select needed fields
      });

    if (!cart) {
      return res.render('user/cart', {
        title: 'Cart',
        includeCss: false,
        products: [],
        totalPrice: 0
      });
    }

    // Filter out any products that might have been deleted
    const validProducts = cart.product.filter(item => item.product != null);
    
    // Update cart if there were any invalid products
    if (validProducts.length !== cart.product.length) {
      cart.product = validProducts;
      cart.totalPrice = await calculateTotalPrice(validProducts);
      await cart.save();
    }

    res.render('user/cart', {
      title: 'Cart',
      includeCss: false,
      products: validProducts,
      totalPrice: cart.totalPrice
    });
  } catch (err) {
    console.error('Error loading cart:', err);
    res.status(500).render('error', { message: 'Error loading cart' });
  }
};

const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const userId = req.user._id;

    // Validate inputs
    if (!productId || quantity < 1) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid product ID or quantity' 
      });
    }

    // Get product details and check stock
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

    let cart = await cartModel.findOne({ user: userId });
    
    if (!cart) {
      // Create new cart if doesn't exist
      cart = new cartModel({
        user: userId,
        product: [{ product: productId, quantity }],
        totalPrice: product.price * quantity
      });
    } else {
      // Check if product exists in cart
      const existingProductIndex = cart.product.findIndex(
        item => item.product.toString() === productId
      );

      if (existingProductIndex !== -1) {
        // Update existing product quantity
        const newQuantity = cart.product[existingProductIndex].quantity + quantity;
        if (newQuantity > product.quantity) {
          return res.status(400).json({ 
            success: false, 
            message: 'Total quantity would exceed available stock',
            availableStock: product.quantity 
          });
        }
        cart.product[existingProductIndex].quantity = newQuantity;
      } else {
        // Add new product to cart
        cart.product.push({ product: productId, quantity });
      }

      cart.totalPrice = await calculateTotalPrice(cart.product);
    }

    await cart.save();

    res.json({ 
      success: true, 
      cartCount: cart.product.length,
      message: 'Product added to cart successfully'
    });
  } catch (err) {
    console.error('Add to cart error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error adding product to cart' 
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
    console.error('Update quantity error:', err);
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
    console.error('Remove from cart error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error removing product from cart' 
    });
  }
};

// Helper function to calculate total price
async function calculateTotalPrice(products) {
  try {
    let total = 0;
    for (const item of products) {
      const product = await productModel.findById(item.product);
      if (product) {
        total += product.price * item.quantity;
      }
    }
    return total;
  } catch (err) {
    console.error('Calculate total price error:', err);
    throw new Error('Error calculating total price');
  }
}

module.exports = {
  loadCart,
  addToCart,
  updateQuantity,
  removeFromCart
};