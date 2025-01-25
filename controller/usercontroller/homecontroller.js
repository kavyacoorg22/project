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
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;

    const selectedCategory = req.query.category || null;

    let productQuery = { isDeleted: false };

    if (selectedCategory) {
      productQuery.category = selectedCategory;
    }

    // Stock Filter
    if (req.query.stock === 'in-stock') {
      productQuery.status = 'In-stock';
    } else if (req.query.stock === 'out-of-stock') {
      productQuery.status = 'Out-of-stock';
    }

    // Sorting
    const sortOptions = {
      'price-low-to-high': { price: 1 },
      'price-high-to-low': { price: -1 },
      'a-to-z': { name: 1 },
      'z-to-a': { name: -1 },
      'new-arrivals': { createdAt: -1 }
    };

    const sort = sortOptions[req.query.sort] || { createdAt: -1 };

    const products = await productModel.find(productQuery)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('category');

    const totalProducts = await productModel.countDocuments(productQuery);
    const totalPages = Math.ceil(totalProducts / limit);

    const categories = await categoryModel.find({ isDeleted: false });

    res.render('user/shop', {
      products,
      page,
      totalPages,
      categories,
      selectedCategory,
      includeCss:false
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
