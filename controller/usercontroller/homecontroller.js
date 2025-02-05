const productModel=require("../../model/adminModel/productModel")
require("dotenv").config()
const reviewModel=require('../../model/userModel/reviewModel')
const categoryModel=require('../../model/adminModel/categoryModel')
const { calculateDiscount } = require('../../utils/calculateDiscount');


const home = async (req, res) => {
  try {
  
    const products = await productModel.find({ isDeleted: false })
      .populate({
        path: 'offers',
        match: {
          status: 'Active',
          startDate: { $lte: new Date() },
          endDate: { $gte: new Date() }
        }
      })
      .populate({
        path: 'category',
        populate: {
          path: 'offers',
          match: {
            status: 'Active',
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() }
          }
        }
      });

    // Add discount calculations to each product
    const processedProducts = products.map(product => {
      const discountInfo = calculateDiscount(product);
      return {
        ...product.toObject(),
        ...discountInfo
      };
    });

    res.render('user/home', {
      title: "Home",
      products: processedProducts,
      includeCss: true,
      csspage: "shop.css"
    });
  } catch (err) {
    console.error('Error in home controller:', err);
    res.status(500).send('Internal Server Error');
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


    const stockFilter = req.query.stock;
    if (stockFilter === 'in-stock') {
      productQuery.quantity = { $gt: 0 };
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
      .populate('category')
      .populate({
        path: 'offers',
        match: {
          status: 'Active',
          startDate: { $lte: new Date() },
          endDate: { $gte: new Date() }
        }
      })
      .populate({
        path: 'category',
        populate: {
          path: 'offers',
          match: {
            status: 'Active',
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() }
          }
        }
      });

      // Add discount calculations to each product
    const processedProducts = products.map(product => {
      const discountInfo = calculateDiscount(product);
      return {
        ...product.toObject(),
        ...discountInfo
      };
    });

    // Fetch categories
    const categories = await categoryModel.find({ isDeleted: false });

    res.render('user/shop', {
      products:processedProducts,
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
    const {id} = req.params;
    const product = await productModel.findById(id).populate('category')
    .populate({
      path: 'offers',
      match: {
        status: 'Active',
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() }
      }
    })
    .populate({
      path: 'category',
      populate: {
        path: 'offers',
        match: {
          status: 'Active',
          startDate: { $lte: new Date() },
          endDate: { $gte: new Date() }
        }
      }
    });

    // Changed productData to product
    const processedProduct = {
      ...product.toObject(),
      ...calculateDiscount(product)
    };

    const reviews = await reviewModel.find({ productId: req.params.id })
      .populate('userId', 'firstname avatar')
      .sort({ createdAt: -1 });

    const relatedProducts = await productModel.find({
      isDeleted: false,
      _id: { $ne: id }
    })
    .limit(4)
    .populate({
      path: 'offers',
      match: {
        status: 'Active',
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() }
      }
    })
    .populate({
      path: 'category',
      populate: {
        path: 'offers',
        match: {
          status: 'Active',
          startDate: { $lte: new Date() },
          endDate: { $gte: new Date() }
        }
      }
    });

    const processedProducts = relatedProducts.map(product => {
      const discountInfo = calculateDiscount(product);
      return {
        ...product.toObject(),
        ...discountInfo
      };
    });

    res.render('user/product', { 
      title: "product",
      product: processedProduct,  // Changed to use processedProduct
      products: processedProducts,
      reviews,
      includeCss: false,
      currentPage: product.name
    });
  } catch (err) {
    console.error('Error in product controller:', err);
    res.status(500).send(err.message); 
  }
};
module.exports = { home,shop,product };
