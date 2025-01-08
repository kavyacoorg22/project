
  
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
    console.log('body',req.body)
    if (!req.user) {
      return res.status(401).json({ message: 'Please login to add a review' });
    }

    const { productId, rating, review } = req.body;
    console.log(req.body)
     
    //  validation
     if (!productId || !rating || !review) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate rating is within acceptable range (e.g., 1-5)
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
    
    // Check if user has already reviewed this product
    const existingReview = await reviewModel.findOne({
      productId,
      userId: req.user._id
    });

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this product' });
    }

    const newReview = await reviewModel.create({
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