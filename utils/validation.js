const validator=require('validator')

const validateSignUpData=(req)=>
{
  const {email ,password }=req.body;
  if(!validator.isEmail(email))
  {
    throw new Error("please enter valid email")
  }else if(!validator.isStrongPassword(password))
  {
    throw new Error("Please Enter Strong password")
  }
}

module.exports={validateSignUpData};