const checkSession=(req,res,next)=>
{
  if(req.session.admin)
  {
    next();
  }else{
    res.redirect('/admin/signup')
  }
}
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