const jwt = require('jsonwebtoken');
const signupModel = require('../model/userModel/signupModel');
require('dotenv').config();

// Main authentication middleware for protected routes
const userAuth = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    
    if (!token) {
      // No token, redirect to login
      return res.redirect('/user/login');
    }

    // Verify token
    const decodedObj = await jwt.verify(token, process.env.JWT_SECRET);
    const { _id } = decodedObj;

    // Find user
    const user = await signupModel.findById(_id);
    
    if (!user) {
      res.clearCookie('token');
      return res.redirect('/user/login');
    }

    if (user.status === 'inactive') {
      res.clearCookie('token');
      return res.redirect('/user/login?error=Account blocked by admin');
    }

    // User is authenticated
    req.user = user;
    
    // Prevent caching for authenticated pages
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    next();
  } catch (err) {
    res.clearCookie('token');
    return res.redirect('/user/login');
  }
};

// Middleware specifically for the login page
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