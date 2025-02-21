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
    onsole.error('Error in home controller:', err);
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

    // Fixed stock filter
    const stockFilter = req.query.stock;
    if (stockFilter === 'in-stock') {
      productQuery.quantity = { $gt: 0 };
    } else if (stockFilter === 'out-of-stock') {
      productQuery.quantity = { $lte: 0 };
    }

    // Get total count for pagination before applying sort
    const totalProducts = await productModel.countDocuments(productQuery);
    const totalPages = Math.ceil(totalProducts / limit);

    // Fetch products with proper sorting
    let aggregatePipeline = [
      { $match: productQuery },
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: '$category' },
      {
        $lookup: {
          from: 'offers',
          localField: 'offers',
          foreignField: '_id',
          as: 'offers'
        }
      },
      {
        $lookup: {
          from: 'offers',
          localField: 'category.offers',
          foreignField: '_id',
          as: 'categoryOffers'
        }
      }
    ];

    // Add sorting stage
    let sortStage = { $sort: { createdAt: -1 } };
    
    switch (req.query.sort) {
      case 'price-low-to-high':
        sortStage = { $sort: { price: 1, _id: 1 } };
        break;
      case 'price-high-to-low':
        sortStage = { $sort: { price: -1, _id: 1 } };
        break;
      case 'a-to-z':
        sortStage = { $sort: { name: 1, _id: 1 } };
        break;
      case 'z-to-a':
        sortStage = { $sort: { name: -1, _id: 1 } };
        break;
      case 'ratings-high-to-low':
        sortStage = { $sort: { averageRating: -1, createdAt: -1, _id: 1 } };
        break;
      case 'ratings-low-to-high':
        sortStage = { $sort: { averageRating: 1, createdAt: -1, _id: 1 } };
        break;
      case 'new-arrivals':
        sortStage = { $sort: { createdAt: -1, _id: 1 } };
        break;
    }

    aggregatePipeline.push(sortStage);

    // Add pagination
    aggregatePipeline.push(
      { $skip: skip },
      { $limit: limit }
    );

    const products = await productModel.aggregate(aggregatePipeline);

    // Filter active offers
    const currentDate = new Date();
    const processedProducts = products.map(product => {
      // Filter active offers
      product.offers = product.offers.filter(offer => 
        offer.status === 'Active' &&
        new Date(offer.startDate) <= currentDate &&
        new Date(offer.endDate) >= currentDate
      );
      
      product.categoryOffers = product.categoryOffers.filter(offer => 
        offer.status === 'Active' &&
        new Date(offer.startDate) <= currentDate &&
        new Date(offer.endDate) >= currentDate
      );

      const discountInfo = calculateDiscount(product);
      return {
        ...product,
        ...discountInfo
      };
    });

    // Fetch categories
    const categories = await categoryModel.find({ isDeleted: false });

    res.render('user/shop', {
      products: processedProducts,
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
    
    res.status(500).send(err.message); 
  }
};
module.exports = { home,shop,product };
