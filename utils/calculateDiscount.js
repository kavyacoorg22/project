

const calculateDiscount = (product) => {
  try {
    let totalDiscount = 0;
    
    // Calculate product-level offers
    const productOffers = product.offers || [];
    productOffers.forEach(offer => {
      if (offer.status === 'Active' && 
          offer.startDate <= new Date() && 
          offer.endDate >= new Date()) {
        totalDiscount += offer.offer;
      }
    });

    // Calculate category-level offers
    if (product.category && product.category.offers) {
      product.category.offers.forEach(offer => {
        if (offer.status === 'Active' && 
            offer.startDate <= new Date() && 
            offer.endDate >= new Date()) {
          totalDiscount += offer.offer;
        }
      });
    }

    // Calculate final price
    const originalPrice = product.price;
    const discountedPrice = originalPrice - (originalPrice * totalDiscount / 100);

    return {
      totalDiscount: Math.round(totalDiscount),
      discountedPrice: Math.round(discountedPrice * 100) / 100,
      hasDiscount: totalDiscount > 0
    };
  } catch (error) {
    console.error('Error calculating discount:', error);
    return {
      totalDiscount: 0,
      discountedPrice: product.price,
      hasDiscount: false
    };
  }
};






module.exports = { calculateDiscount };


