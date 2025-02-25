const jwt = require('jsonwebtoken');
const signupModel = require('../model/userModel/signupModel');
require('dotenv').config();







const userAuth = async (req, res, next) => {
  try {
    const token = req.cookies.token;
   
    
    if (!token) {
      // Store the attempted URL for redirect after login
      req.session.returnTo = req.originalUrl;
      
      // Handle XHR/API requests
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(401).json({ 
          authRequired: true,
          returnUrl: req.originalUrl
        });
      }
      
     
      res.locals.showAuthRequired = true;
      res.locals.returnUrl = req.originalUrl;
      req.user = { _id: null };
      // Continue to next middleware/controller
      return next();
    }
    
    // Token exists, verify it
    const decodedObj = await jwt.verify(token, process.env.JWT_SECRET);
    const user = await signupModel.findById(decodedObj._id);
    
    if (!user || user.status === 'inactive') {
      res.clearCookie('token');
      
      // Store return path and set auth required flag
      req.session.returnTo = req.originalUrl;
      res.locals.showAuthRequired = true;
      res.locals.returnUrl = req.originalUrl;
     
      // Continue to next middleware/controller
      return next();
    }

    // Valid authentication
    req.user = user;
    res.locals.user = user; // Make user available to templates
    res.locals.showAuthRequired = false; // Explicitly set to false
    next();
    
  } catch (err) {
    // Token verification failed
    res.clearCookie('token');
    
    // Store return path and set auth required flag
    req.session.returnTo = req.originalUrl;
    res.locals.showAuthRequired = true;
    res.locals.returnUrl = req.originalUrl;
    req.user = { _id: null };
    // Continue to next middleware/controller
    return next();
  }
};

const checkLoginPage = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    
    if (!token) {
      // No token, allow access to login page
      return next();
    }

    // If there's a token, verify it
    const decodedObj = await jwt.verify(token, process.env.JWT_SECRET);
    const { _id } = decodedObj;

    const user = await signupModel.findById(_id);
    
    if (!user || user.status === 'inactive') {
      // Invalid user or inactive status, clear token and show login page
      res.clearCookie('token');
      return next();
    }

    // Valid token and active user, redirect to home
    return res.redirect('/user/home');
    
  } catch (err) {
    // Invalid token, clear it and show login page
    res.clearCookie('token');
    return next();
  }
};

module.exports = { userAuth, checkLoginPage };