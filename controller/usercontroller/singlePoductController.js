
const orderModel=require('../../model/userModel/orderModel')
const reviewModel = require('../../model/userModel/reviewModel');

const loadreviews = async (req, res) => {
  try {
    const reviews = await reviewModel.find({ productId: req.params.productId })
      .populate('userId', 'firstname avatar')
      .sort({ createdAt: -1 });

    // Filter out reviews with null userId
    const validReviews = reviews.filter(review => review.userId != null);

    res.json({ reviews: validReviews });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

const reviews = async (req, res) => {
  try {
   
    if (!req.user) {
      return res.status(401).json({ message: 'Please login to add a review' });
    }

    const { productId, rating, review } = req.body;
  

    
    if (!productId || !rating || !review) {
      return res.status(400).json({ message: 'Missing required fields' });
    }


    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Check product is purchased
    const hasPurchased = await orderModel.findOne({
      userId: req.user._id,
      'items.productId': productId,
      status: 'delivered', 
    });

    if (!hasPurchased) {
      return res.status(403).json({
        message: 'You can only review products that you have purchased',
      });
    }

    // Check if the user has already reviewed this product
    const existingReview = await reviewModel.findOne({
      productId,
      userId: req.user._id,
    });

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this product' });
    }

    const newReview = await reviewModel.create({
      productId,
      userId: req.user._id,
      rating,
      review,
    });

    res.status(201).json({ success: true, review: newReview });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports={reviews,loadreviews}