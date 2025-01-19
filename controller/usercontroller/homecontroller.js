const productModel=require("../../model/adminModel/productModel")
require("dotenv").config()
const reviewModel=require('../../model/userModel/reviewModel')
const categoryModel=require('../../model/adminModel/categoryModel')


const home = async (req, res) => {
  try {
    const products=await productModel.find({isDeleted:false})
    res.render('user/home', { title: "Home",products ,includeCss:false});
  } catch (err) {
    res.status(500).send(err.message); 
  }
};

const shop = async (req, res) => {
  try {
    // pagination
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;

    // Get category from URL if any
    const selectedCategory = req.query.category;

  
    let productQuery = { isDeleted: false }; // This will only get active products
    if (selectedCategory) {
      productQuery.category = selectedCategory;
    }

  
    const products = await productModel.find(productQuery)
      .skip(skip)
      .limit(limit)
      .populate('category'); // Populate category information

  
    const totalProducts = await productModel.countDocuments(productQuery);
    const totalPages = Math.ceil(totalProducts / limit);

    // 6. Get only active categories
    const categories = await categoryModel.find({ isDeleted: false });

    // 7. Render the page
    res.render('user/shop', {
      title: "shop",
      products,
      page,
      totalPages,
      categories,
      selectedCategory,
      includeCss: false
    });

  } catch (err) {
    console.error('Shop page error:', err);
    res.status(500).send(err.message);
  }
};

const product = async (req, res) => {
  try {
    const {id}=req.params;
    const product=await productModel.findById(id).populate('category')
    
    const reviews = await reviewModel.find({ productId: req.params.id })
      .populate('userId', 'firstname avatar')
      .sort({ createdAt: -1 });

  
    const relatedProducts=await productModel.find({isDeleted:false})
    res.render('user/product', { title: "product" ,product,relatedProducts,reviews,includeCss:false,currentPage:product.name});
  } catch (err) {
    res.status(500).send(err.message); 
  }
};
module.exports = { home,shop,product };
