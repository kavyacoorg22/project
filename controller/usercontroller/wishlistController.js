const wishlistModel = require('../../model/userModel/wishlistModel');

const loadWishlist = async(req, res) => {
  try {
    const wishlist = await wishlistModel.findOne({ userId: req.user._id })
      .populate('products'); // Make sure 'products' is the correct field name in your schema
    
    res.render('user/wishlist', {
      title: "Wishlist",
      includeCss: false,
      wishlist: wishlist || { products: [] } // Provide default empty products array
    });
  } catch(err) {
    
    res.status(500).send('Error loading wishlist');
  }
}

const addWishlist = async (req, res) => {
  try {
    const productId = req.params.productId;
    
    const result = await wishlistModel.findOneAndUpdate(
      { userId: req.user._id },
      { 
        $addToSet: { products: productId } // Uses $addToSet to avoid duplicates
      },
      { 
        upsert: true, // Creates new document if none exists
        new: true // Returns the updated document
      }
    );

    res.json({ 
      success: true,
      wishlistCount: result.products.length
    });
  } catch (error) {
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add to wishlist'
    });
  }
}

const removeFromWishlist = async (req, res) => {
  try {
    const productId = req.params.productId;
    
    const result = await wishlistModel.findOneAndUpdate(
      { userId: req.user._id },
      { $pull: { products: productId } }, // Uses $pull to remove the item
      { new: true }
    );

    res.json({ 
      success: true,
      wishlistCount: result ? result.products.length : 0
    });
  } catch (error) {
 
    res.status(500).json({ 
      success: false, 
      message: 'Failed to remove from wishlist'
    });
  }
}
module.exports={loadWishlist,addWishlist,removeFromWishlist}