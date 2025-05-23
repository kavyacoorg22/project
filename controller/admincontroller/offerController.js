const offerModel=require('../../model/adminModel/offerModel')
const productModel=require('../../model/adminModel/productModel')
const categoryModel=require('../../model/adminModel/categoryModel')
const mongoose=require('mongoose')


const loadAddOffer=async(req,res)=>{
  try{
    
    res.render('admin/addoffer',{ title:'addOffer',csspage:'addoffer.css',layout:'./layout/admin-layout.ejs'});
  }catch(err)
  {
    res.status(500).send(err.message);
  }
}

const loadOffer = async(req, res) => {
  try {
    const offers = await offerModel.find({});
    
    // Process each offer to get the correct name
    const processedOffers = await Promise.all(offers.map(async (offer) => {
      const offerObj = offer.toObject();
      
      if (offer.productCategory === 'product') {
        const product = await productModel.findById(offer.productCategoryID);
        offerObj.itemName = product ? product.name : 'N/A';
      } else {
        const category = await categoryModel.findById(offer.productCategoryID);
        offerObj.itemName = category ? category.name : 'N/A';
      }
      
      return offerObj;
    }));

    res.render('admin/offer', {
      title: 'Offer',
      csspage: 'offer.css',
      layout: './layout/admin-layout.ejs',
      offers: processedOffers
    });
  } catch(err) {

    res.status(500).send(err.message);
  }
}

const loadeditOffer=async(req,res)=>{
 
  try {
    const offer = await offerModel.findById(req.params.id);
    const categories = await categoryModel.find({isDeleted:false});
    const products = await productModel.find({isDeleted:false});
    res.render('admin/editOffer',{ title:'editOffer',csspage:'editOffer.css',layout:'./layout/admin-layout.ejs',offer, categories, products});
    
  } catch (error) {
    res.status(500).send(error.message);
  }
}


const offer=async(req,res)=>{
  try{
     
   
  }catch(err)
  {

  }
}

const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    if (!['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const offer = await offerModel.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    res.json({
      success: true,
      message: 'Status updated successfully',
      offer
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Error updating status',
      error: error.message
    });
  }
};

const getApplicable=async (req, res) => {
  try {
    const { type } = req.params;
    let items = [];
    
    if (type === 'category') {
    
      items = await categoryModel.find({isDeleted:false}).select('name _id');
    } else if (type === 'product') {
     
      items = await productModel.find({isDeleted:false}).select('name _id');
    }
    
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}






const addoffer = async (req, res) => {
  try {
    const {name, description, offer, productCategory, productCategoryID, startDate, endDate, status} = req.body;
  
    if(!name || !offer || !description || !productCategory || !productCategoryID || !startDate || !endDate || !status) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({
        success: false,
        message: "End date must be after start date"
      });
    }

    if(name.trim() === '' || description.trim() === '') {
      return res.status(400).json({
        success: false,
        message: "Fields should not be empty or only space"
      });
    }

    if(offer > 100 || offer < 0) {
      return res.status(400).json({
        success: false,
        message: "Offer should be 1 to 100"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(productCategoryID)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product/category ID"
      });
    }

    // Create new offer
    const newOffer = new offerModel({
      name,
      description,
      offer,
      productCategory,
      productCategoryID,
      startDate,
      endDate,
      status
    });

    const savedOffer = await newOffer.save();

    // Update product or category based on offer type
    if (productCategory === 'product') {
      await productModel.findByIdAndUpdate(
        productCategoryID,
        { $addToSet: { offers: savedOffer._id } }
      );
    } else if (productCategory === 'category') {
      // Update category
      await categoryModel.findByIdAndUpdate(
        productCategoryID,
        { $addToSet: { offers: savedOffer._id } }
      );
      
      
    }

    return res.status(200).json({
      success: true,
      message: 'Offer added successfully',
      offer: savedOffer
    });

  } catch (error) {
 
    return res.status(500).json({
      success: false,
      message: 'Error while creating offer',
      error: error.message
    });
  }
};

const editOffer = async (req, res) => {
  try {
    const {
      name,
      description,
      offer,
      productCategory,
      productCategoryID,
      startDate,
      endDate,
      status
    } = req.body;

    if (offer < 0 || offer > 100) {
      return res.status(400).json({
        success: false,
        message: "Offer percentage must be between 0 and 100"
      });
    }

    // Get original offer to compare changes
    const originalOffer = await offerModel.findById(req.params.id);
    if (!originalOffer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found"
      });
    }

    // Remove offer from old product/category if target changed
    if (originalOffer.productCategoryID.toString() !== productCategoryID || 
        originalOffer.productCategory !== productCategory) {
      
      if (originalOffer.productCategory === 'product') {
        await productModel.findByIdAndUpdate(
          originalOffer.productCategoryID,
          { $pull: { offers: originalOffer._id } }
        );
      } else if (originalOffer.productCategory === 'category') {
        await categoryModel.findByIdAndUpdate(
          originalOffer.productCategoryID,
          { $pull: { offers: originalOffer._id } }
        );
        // Remove from all products in old category
        await productModel.updateMany(
          { category: originalOffer.productCategoryID },
          { $pull: { offers: originalOffer._id } }
        );
      }
    }

    // Update the offer
    const updatedOffer = await offerModel.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        offer,
        productCategory,
        productCategoryID,
        startDate,
        endDate,
        status
      },
      { new: true, runValidators: true }
    );

    // Add offer to new product/category if target changed
    if (originalOffer.productCategoryID.toString() !== productCategoryID || 
        originalOffer.productCategory !== productCategory) {
      
      if (productCategory === 'product') {
        await productModel.findByIdAndUpdate(
          productCategoryID,
          { $addToSet: { offers: updatedOffer._id } }
        );
      } else if (productCategory === 'category') {
        await categoryModel.findByIdAndUpdate(
          productCategoryID,
          { $addToSet: { offers: updatedOffer._id } }
        );
        // Add to all products in new category
        await productModel.updateMany(
          { category: productCategoryID },
          { $addToSet: { offers: updatedOffer._id } }
        );
      }
    }

    res.json({
      success: true,
      message: "Offer updated successfully",
      offer: updatedOffer
    });

  } catch (error) {
   
    res.status(500).json({
      success: false,
      message: "Error updating offer",
      error: error.message
    });
  }
};
module.exports={updateStatus,loadAddOffer,loadOffer,loadeditOffer,getApplicable,addoffer,editOffer}