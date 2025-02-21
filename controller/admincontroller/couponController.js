const couponModel=require('../../model/adminModel/couponModel')
const loadAddCoupon=async(req,res)=>{
  try{
    res.render('admin/addcoupon',{ title:'addCoupon',csspage:'addcoupon.css',layout:'./layout/admin-layout.ejs'});
  }catch(err)
  {
    res.send(err)
  }
}

const addCoupon=async(req,res)=>{
  try{
    
   const {name,couponCode,description,discount,minimumPurchase,startDate,endDate}=req.body;
  
   if(!name||!couponCode||!description||!discount||!minimumPurchase||!startDate||!endDate)
   {
    return res.status(400).json({message:"All fields are required"})
   }


   if (new Date(endDate) <= new Date(startDate)) {
     return res.status(400).json({message:"End date must be after start date"})
     }

     const existingCoupon = await couponModel.findOne({ couponCode: couponCode.toUpperCase() });
     if (existingCoupon) {
      return res.status(400).json({message:"Coupon already exists"})
     }

     if(name.trim()===''||description.trim()==='')
     {
     return res.status(400).json({message:"fields should not be empty or only sapce"})
     }

     if(discount>100 || discount<0)
     {
      return res.status(400).json({message:"discount should be 1 to 100"})
     }
     
     
     if(minimumPurchase<0)
      {
       return res.status(400).json({message:"minimum purchase should not be negative value"})
      }

     if(couponCode!==couponCode.toUpperCase())
     {
      return res.status(400).json({message:"couponCode must be in upperCase"})
     }

     const newCoupon=new couponModel({
      name,couponCode,description,discount,minimumPurchase,startDate,endDate,
     })
     await newCoupon.save()

     if(newCoupon)
     {
      return res.status(400).json({
        success:true,
        message:"Coupon added successfully"})
     }
  }catch(err)
  {
    res.send(err)
  }
}

const loadCoupon=async(req,res)=>{
  try{
     const coupons=await couponModel.find({})
    res.render('admin/coupon',{ title:'coupon',csspage:'coupon.css',layout:'./layout/admin-layout.ejs',coupons});
  }catch(err)
  {
    res.send(err)
  }
}

const changeStatus = async (req, res) => {
  try {
    
    const { couponId } = req.params;

    const { status } = req.body;

    const updatedCoupon = await couponModel.findOneAndUpdate(
      { _id: couponId },
      { $set: { status: status } },
      { new: true }
    );

    if (!updatedCoupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }


    res.json({
      success: true,
      message: 'Coupon status updated',
      item: updatedCoupon, 
    });
  } catch (err) {

    res.status(500).json({
      success: false,
      message: 'Error updating coupon status',
      error: err.message,
    });
  }
};



const deleteCoupon= async (req, res) => {
  try {
    
    const { couponId } = req.params;

    // Find and delete the coupon
    const deletedCoupon = await couponModel.findByIdAndDelete(couponId);

    if (!deletedCoupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }

    // Respond with success
    res.json({
      success: true,
      message: 'Coupon deleted successfully',
      item: deletedCoupon,
    });
  } catch (error) {
   
    res.status(500).json({
      success: false,
      message: 'Error deleting coupon',
      error: error.message,
    });
  }
}




module.exports={loadAddCoupon,loadCoupon,addCoupon,changeStatus,deleteCoupon}