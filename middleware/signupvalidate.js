const validator = require('validator');

const validateSignUpData = (req, res,next) => {
 
  const { firstname, lastname, email, number, password, confirmPassword } = req.body;

  if (validator.isEmpty(firstname) && validator.isEmpty(lastname)) {
    
    return res.status(400).json({
      success: false,
      message: "Firstname and Lastname are required.",
    });
  }

  if (!validator.isEmail(email)) {
    
    return res.status(400).json({
      success: false,
      message: "Please enter a valid email address.",
    });
  }

  if (!validator.isMobilePhone(number, 'any')) {
    
    return res.status(400).json({
      success: false,
      message: "Please enter a valid phone number.",
    });
  }

  if (!validator.isStrongPassword(password)) {
    
    return res.status(400).json({
      success: false,
      message: "Please enter a strong password with at least 8 characters, including uppercase, lowercase, numbers, and symbols.",
    });
  }

  if (!validator.isLength(firstname, { max: 15 }) || !validator.isLength(lastname, { max: 15 })) {
    return res.status(400).json({
      success: false,
      message: "Firstname and Lastname must not exceed 15 characters.",
    });
  }

  if (!validator.equals(password, confirmPassword)) {
    
    return res.status(400).json({
      success: false,
      message: "Passwords do not match.",
    });
  }

 next()
};

module.exports=validateSignUpData;
