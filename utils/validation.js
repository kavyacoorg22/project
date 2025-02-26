const validator=require('validator')

const validateSignUpData = (req) => {
  const { email, password } = req.body;

  
  const trimmedEmail = email.trim();
 
  
  const isValidEmail = validator.isEmail(trimmedEmail);

  
  if (!isValidEmail) {
    throw new Error("please enter valid email");
  } 
  
  req.body.email = trimmedEmail;
}

module.exports={validateSignUpData};