const productModel=require("../../model/adminModel/productModel")
require("dotenv").config()
const reviewModel=require('../../model/userModel/reviewModel')

const home = async (req, res) => {
  try {
    const products=await productModel.find({isDeleted:false})
    res.render('user/home', { title: "Home",products });
  } catch (err) {
    res.status(500).send(err.message); 
  }
};

const shop = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Default to page 1
        const limit = 8; // Products per page
        const skip = (page - 1) * limit;  //1-1*3=0 ,,,2-1*3=3
    
        // Fetch products with pagination
        const products = await productModel.find({ isDeleted: false })
                                      .skip(skip)
                                      .limit(limit);
      // Add this to your user app route
products.forEach(product => {
  if (product.images && product.images.length > 0) {
    console.log('Image URL:', `${process.env.ADMIN_URL}/images/${product.images[0]}`);
  }
});
    
        // Total products for pagination
        const totalProducts = await productModel.countDocuments({ isDeleted: false });
        const totalPages = Math.ceil(totalProducts / limit);
    
       
        
    
    res.render('user/shop', { title: "shop",products,page,totalPages });
  } catch (err) {
    res.status(500).send(err.message); // Send an error response if something goes wrong
  }
};
const product = async (req, res) => {
  try {
    const {id}=req.params;
    const product=await productModel.findById(id)
    const reviews = await reviewModel.find({ productId: req.params.id })
      .populate('userId', 'firstname avatar')
      .sort({ createdAt: -1 });

  
    const relatedProducts=await productModel.find({isDeleted:false})
    res.render('user/product', { title: "product" ,product,relatedProducts,reviews});
  } catch (err) {
    res.status(500).send(err.message); 
  }
};
module.exports = { home,shop,product };
