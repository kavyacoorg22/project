const productModel=require("../../model/adminModel/productModel")
require("dotenv").config()
const reviewModel=require('../../model/userModel/reviewModel')
const categoryModel=require('../../model/adminModel/categoryModel')


const home = async (req, res) => {
  try {
    const products=await productModel.find({isDeleted:false})
    res.render('user/home', { title: "Home",products ,includeCss:true,csspage:"shop.css"});
  } catch (err) {
    res.status(500).send(err.message); 
  }
};


const shop = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;

    // Base query
    let productQuery = { isDeleted: false };

    // Category filter
    const selectedCategory = req.query.category || null;
    if (selectedCategory) {
      productQuery.category = selectedCategory;
    }

    // Search functionality
    const searchQuery = req.query.search;
    if (searchQuery) {
      productQuery.$or = [
        { name: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } }
      ];
    }

    // Stock Filter - Modified to handle the stock status correctly
    const stockFilter = req.query.stock;
    if (stockFilter === 'in-stock') {
      productQuery.quantity = { $gt: 0 }; // Assuming you have a quantity field
      productQuery.status = 'In-stock';
    } else if (stockFilter === 'out-of-stock') {
      productQuery.$or = [
        { quantity: { $lte: 0 } },
        { status: 'Out-of-stock' }
      ];
    }

    // Sorting options
    let sort = { createdAt: -1 }; // default sort
    
    switch (req.query.sort) {
      case 'price-low-to-high':
        sort = { price: 1 };
        break;
      case 'price-high-to-low':
        sort = { price: -1 };
        break;
      case 'a-to-z':
        sort = { name: 1 };
        break;
      case 'z-to-a':
        sort = { name: -1 };
        break;
      case 'ratings-high-to-low':
        sort = { averageRating: -1, createdAt: -1 }; // Secondary sort by creation date
        break;
      case 'ratings-low-to-high':
        sort = { averageRating: 1, createdAt: -1 };
        break;
      case 'new-arrivals':
        sort = { createdAt: -1 };
        break;
    }

    // Get total count for pagination
    const totalProducts = await productModel.countDocuments(productQuery);
    const totalPages = Math.ceil(totalProducts / limit);

    // Fetch products
    const products = await productModel.find(productQuery)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('category');

    // Fetch categories
    const categories = await categoryModel.find({ isDeleted: false });

    res.render('user/shop', {
      products,
      categories,
      page,
      totalPages,
      selectedCategory,
      searchQuery,
      currentSort: req.query.sort,
      currentStock: stockFilter,
      includeCss: false,
      currentPage: 'Shop'
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
