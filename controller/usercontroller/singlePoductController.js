
  
const reviewModel = require('../../model/userModel/reviewModel');

const loadreviews= async (req, res) => {
  try {
    const reviews = await reviewModel.find({ productId: req.params.productId })
      .populate('userId', 'firstname avatar')
      .sort({ createdAt: -1 });

    res.json({ reviews });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}


const reviews=async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Please login to add a review' });
    }

    const { productId, rating, review } = req.body;
    
    // Check if user has already reviewed this product
    const existingReview = await reviewModel.findOne({
      productId,
      userId: req.user._id
    });

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this product' });
    }

    const newReview = await Review.create({
      productId,
      userId: req.user._id,
      rating,
      review
    });

    res.status(201).json({ success: true, review: newReview });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

module.exports={reviews,loadreviews}