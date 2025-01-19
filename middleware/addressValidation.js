const validator=require('validator')

const addressvalidation=async(req,res,next)=>{
  
    const { firstname, lastname, address, email, mobile, postalCode } = req.body;

    if (!firstname || !lastname || !address || !email || !mobile || !postalCode) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (firstname.trim() === '' || lastname.trim() === '' || address.trim() === '') {
      return res.status(400).json({ message: "Fields should not be empty or only spaces" });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Enter valid email" });
    }

    if (!validator.isMobilePhone(mobile, 'any', { strictMode: false })) {  
      return res.status(400).json({ message: "Enter valid phone number" });
    }
   if(address.length<30)
   {
    return res.status(400).json({ message: "Address should contain atleast 20 charecteres" });
   }
    
    if (!/^\d{6}$/.test(postalCode)) {  
      return res.status(400).json({ message: "Postal code should contain exactly 6 digits" });
    }
    next()
  }

module.exports=addressvalidation