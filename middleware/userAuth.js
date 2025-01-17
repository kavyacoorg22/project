const jwt = require('jsonwebtoken');
const signupModel = require('../model/userModel/signupModel');
require('dotenv').config();

const userAuth = async (req, res, next) => {
  try {
    // Read the token from the cookies
    const cookies = req.cookies;
    const { token } = cookies;
    
    if (!token) {
      return res.redirect('/user/login');
    }

    // Validate token and decode it
    const decodedObj = await jwt.verify(token, process.env.JWT_SECRET);
    const { _id } = decodedObj;

    // Find the user by ID
    const user = await signupModel.findById(_id);
    if (!user) {
      return res.status(404).send("User not found");
    }
   
    if(user.status==='inactive')
    {
      return res.status(404).send("Access denied. This user is blocked by the admin and can't access the site.")
    }
   
    // Attach the user to the request object
    req.user = user;
    next();
  } catch (err) {
   
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).send("Invalid token");
    } else if (err.name === 'TokenExpiredError') {
      return res.status(401).send("please login to continue");
    }
    
    return res.status(400).send("Authentication error: " + err.message);
  }
};






module.exports={userAuth}