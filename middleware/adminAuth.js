const checkSession = (req, res, next) => {
  
  
  if (!req.session || !req.session.admin) {
    
    return res.redirect('/admin/signup');
  }
  
  next();
};
const isSignup=(req,res,next)=>
{
  if(req.session.admin)
  {
    res.redirect('/admin/dashboard')
  }else
  {
    next();
  }
}

module.exports={isSignup,checkSession}