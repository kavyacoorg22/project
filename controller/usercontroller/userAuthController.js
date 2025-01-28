const signupModel=require('../../model/userModel/signupModel')

const nodemailer = require('nodemailer');
const jwt=require("jsonwebtoken")
require('dotenv').config();
const bcrypt=require('bcrypt')




// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};


const loadsignup=async(req,res)=>{
  try{
    res.render('userAuth/signup',{title:'Signup',
      layout:'./layout/auth-layout',
      csspage:"signup.css",
      firstname: " ",  
      lastname: " ",
      email: " ",
      number: " ",
      password: " ",
      confirmPassword: " "
    })
  }
  catch(err)
  {
    console.log(err.message)
  }
}

const loadLogin=async(req,res)=>{
  try{
     res.render('userAuth/login',{title:"login",layout:"./layout/auth-layout",csspage:'login.css',email:' ',password:' '})
  }catch(err)
  {
    res.send(err.message)
  }
}




const signup = async (req, res) => {
  try {
    const { firstname, lastname, email, number, password, confirmPassword } = req.body;
    
    // Check for existing user
    const existingUser = await signupModel.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email is already registered."
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = new signupModel({
      firstname,
      lastname,
      email,
      number,
      password: hashedPassword,
      confirmPassword
    });
    
    await user.save();
    
    return res.status(201).json({
      success: true,
      message: "User registered successfully."
    });

  } catch (err) {
    console.error(err.message);
    return res.status(500).json({
      success: false,
      message: "An error occurred during signup. Please try again later."
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Fetch user from the database by email
    const user = await signupModel.findOne({ email });

    // Check if user exists
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Compare the passwords 
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Create JWT token
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Set cache control headers BEFORE sending any response
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '-1'
    });

    // Set cookie with secure options
    res.cookie("token", token, {
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      
    });

    // Send the response LAST, after setting headers and cookies
    return res.status(200).json({
      success: true,
      message: 'Login successful',
    });
  
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during login',
    });
  }
};

const loademail=async(req,res)=>{
  try{
     res.render('userAuth/email',{title:"email",csspage:"email.css",layout:"./layout/auth-layout"})
  }catch(err)
  {
    res.send(err.message)
  }
}

const email = async (req, res) => {
  try {
      const { email } = req.body;
      
      // Validate email input
      if (!email) {
          return res.status(400).json({ 
              success: false,
              message: "Email is required" 
          });
      }

      // Find user
      const user = await signupModel.findOne({ email });
      
      if (!user) {
          return res.status(404).json({ 
              success: false,
              message: "Enter registered Email" 
          });
      }

      // Generate OTP
      const otp = generateOTP();
      const expiryTime = Date.now() + 60 * 1000; // 60 seconds

      // Store OTP data in session
      req.session.otpData = {
          email,
          otp,
          expiryTime
      };

      // Force save session before proceeding
      await new Promise((resolve, reject) => {
          req.session.save((err) => {
              if (err) reject(err);
              else resolve();
          });
      });

      
      // Send OTP email
      await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: 'Password Reset OTP',
          text: `Your OTP for password reset is: ${otp}. Valid for 60 seconds.`
      });
      
      return res.status(200).json({
          success: true,
          message: "OTP has been sent to your email",
          redirectUrl: '/user/otp'
      });

  } catch (error) {
      console.error('Server error:', error);
      return res.status(500).json({ 
          success: false,
          message: 'An unexpected error occurred. Please try again.' 
      });
  }
};




const loadotp = async (req, res) => {
  try {
      // Force session reload before accessing data
      await new Promise((resolve, reject) => {
          req.session.reload((err) => {
              if (err) reject(err);
              else resolve();
          });
      });

     
      const otpData = req.session.otpData;
      
      if (!otpData || !otpData.email || !otpData.expiryTime) {
          return res.redirect('/user/email');
      }

      res.render('userAuth/otp', {
          title: "otp",
          csspage: "otp.css",
          layout: "./layout/auth-layout",
          email: otpData.email,
          expiryTime: otpData.expiryTime
      });
  } catch (err) {
      console.error('Load OTP error:', err);
      res.redirect('/user/email');
  }
};





const verifyotp = async (req, res) => {
  try {
      // Force session reload before verification
      await new Promise((resolve, reject) => {
          req.session.reload((err) => {
              if (err) reject(err);
              else resolve();
          });
      });

      const { otp } = req.body;
      const otpData = req.session.otpData;

      if (!otpData || !otpData.otp || !otpData.expiryTime) {
          return res.status(400).json({ 
              success: false,
              message: 'OTP expired or invalid' 
          });
      }

      if (Date.now() > otpData.expiryTime) {
          req.session.otpData = null;
          await new Promise(resolve => req.session.save(resolve));
          return res.status(400).json({ 
              success: false,
              message: 'OTP expired' 
          });
      }

      if (otp !== otpData.otp) {
          return res.status(400).json({ 
              success: false,
              message: 'Invalid OTP' 
          });
      }

      // Instead of clearing otpData, just update it to keep the email
      req.session.otpData = {
          email: otpData.email,  // Keep the email
          verified: true         // Add a verification flag
      };
      await new Promise(resolve => req.session.save(resolve));

      res.json({ 
          success: true,
          redirectUrl: '/user/password'
      });
  } catch (error) {
      console.error('Verify OTP error:', error);
      res.status(500).json({ 
          success: false,
          message: 'Server error' 
      });
  }
};

const resendotp = async (req, res) => {
  try {
      const { email } = req.body;
      const otp = generateOTP();
      const expiryTime = Date.now() + 60 * 1000; // 60 seconds

      // Update session with new OTP data
      req.session.otpData = {
          email,
          otp,
          expiryTime
      };

      // Force save session before sending email
      await new Promise((resolve, reject) => {
          req.session.save((err) => {
              if (err) reject(err);
              else resolve();
          });
      });

      await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: 'Password Reset OTP',
          text: `Your new OTP for password reset is: ${otp}. Valid for 60 seconds.`
      });

      res.json({ 
          success: true,
          message: 'OTP resent successfully' 
      });
  } catch (error) {
      console.error('Resend OTP error:', error);
      res.status(500).json({ 
          success: false,
          message: 'Failed to resend OTP' 
      });
  }
};







const password=async(req,res)=>{
  try{
     res.render('userAuth/password',{title:"password",csspage:"password.css",layout:"./layout/auth-layout"})
  }catch(err)
  {
    res.send(err.message)
  }
}

const resetPassword = async (req, res) => {
  console.log('Password reset request received');
  console.log('Request body:', req.body);
  console.log('Session data:', req.session);
  try {
    const { newPassword, confirmPassword } = req.body;
    
    // Check if session data exists and is verified
    if (!req.session.otpData || !req.session.otpData.email || !req.session.otpData.verified) {
      return res.status(400).json({
        success: false,
        message: "Please verify your OTP first"
      });
    }

    const { email } = req.session.otpData;

    if (!email || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }
    // Check if passwords match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords don't match"
      });
    }

    // Hash both passwords
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    //const hashedConfirmPassword = await bcrypt.hash(confirmPassword, 10);

    // Update both password fields in database
    const user = await signupModel.findOneAndUpdate(
      { email: email },
      { 
        password: hashedPassword,
        confirmPassword
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Clear OTP session data
    delete req.session.otpData;
    await new Promise(resolve => req.session.save(resolve));

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
      redirectUrl: '/user/login'
    });

  } catch (error) {
    console.error('Password change error:', error);
    return res.status(500).json({
      success: false,
      message: "Failed to update password"
    });
  }
};

module.exports={loadsignup,loadLogin,signup,login,email,verifyotp,password,loademail,loadotp,resendotp,resetPassword}