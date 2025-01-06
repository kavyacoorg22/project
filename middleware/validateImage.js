

const validateImg=(req,res,next)=>{
  file=req.files;  // it handling multiple images so req.files
  if(!file || file.length<3)
  {
    return res.redirect('/admin/product/add?error:Please upload atleast 3 images')
  }
  next();
}

module.exports=validateImg;