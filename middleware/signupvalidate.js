const validator = require('validator');

const validateSignUpData = (req, res,next) => {
  console.log(req.body)
  console.log("middleware is called")
  const { firstname, lastname, email, number, password, confirmPassword } = req.body;

  if (validator.isEmpty(firstname) || validator.isEmpty(lastname)) {
    console.log('first')
    return res.status(400).json({
      success: false,
      message: "Firstname and Lastname are required.",
    });
  }

  if (!validator.isEmail(email)) {
    console.log('second')
    return res.status(400).json({
      success: false,
      message: "Please enter a valid email address.",
    });
  }

  if (!validator.isMobilePhone(number, 'any')) {
    console.log('third')
    return res.status(400).json({
      success: false,
      message: "Please enter a valid phone number.",
    });
  }

  if (!validator.isStrongPassword(password)) {
    console.log('fourth')
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
    console.log("fifth")
    return res.status(400).json({
      success: false,
      message: "Passwords do not match.",
    });
  }

 next()
};

module.exports=validateSignUpData;
