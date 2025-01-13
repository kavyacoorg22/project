const signinModel=require('../../model/adminModel/signinModel')
const bcrypt=require('bcrypt');
const {validateSignUpData}=require('../../utils/validation')



const loadSignup=async(req,res)=>
{
 try{
  
  res.render('signup', { email: ' ', password: ' ',title: 'Signin', layout: './layout/adminauth-layout' });
}catch(err)
{
  res.status(400).send(err.message)
}
}
//signup
const signup = async (req, res) => {
  try {
    validateSignUpData(req);
    const {email, password} = req.body;
    const admin = await signinModel.findOne({ email });

    if (!admin) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    
    req.session.admin = true;
    req.session.adminId = admin._id; // Store admin ID
    

    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ message: 'Session error' });
      }
      return res.status(200).json({ message: 'Login successful' });
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'An error occurred. Please try again.' });
  }
};

const loadDashboard=async(req,res)=>
{
  try{
  
    res.render('admin/dashboard',{ title:'dashboard',csspage:'dashboard.css',layout:'./layout/admin-layout.ejs'});
   
  }catch(err){
     res.send(err.message)
  }
}

const loadcategory=async(req,res)=>
{
  try{
    res.render('admin/category',{title:"category",csspage:"category.css",layout: './layout/admin-layout.ejs'})//category list
  }catch(err)
  {
      res.send(err.message)
  }
}




//load createcategory page
const loadCreatecat=async(req,res)=>
  {
    try{
      res.render('admin/createcategory',{title:"user",csspage:"createcategory.css",layout: './layout/admin-layout'})  
    }catch(err)
    {
      res.send(err.message)
    }
  }


















 const logout=(req,res) => {

  req.session.destroy((err) => {
    if (err) {
      console.error('Failed to destroy session:', err);
      return res.status(500).send('Failed to log out');
    }

    res.redirect('/admin/signup');  // Redirect to login page after logout
  });
}




    module.exports={loadSignup,signup,loadDashboard,loadcategory,loadCreatecat,logout,
                    

    }