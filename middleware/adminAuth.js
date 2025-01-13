const checkSession = (req, res, next) => {
  console.log('Session data:', req.session); 
  
  if (!req.session || !req.session.admin) {
    console.log('No valid session found');
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