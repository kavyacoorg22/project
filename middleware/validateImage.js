

const validateImg=(req,res,next)=>{
  file=req.files;  // it handling multiple images so req.files
  if(!file || file.length<3)
  {
    return res.status(400).json({
      sucess:false,
      message:"please upolad atleast 3 images"
    })
  }
  next();
}

module.exports=validateImg;