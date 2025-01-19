const addressModel=require('../../model/userModel/addressModel')
const validator=require('validator')

const loadAddress=async(req,res)=>{
  try{
  const addresses=await addressModel.find({})
  res.render('user/address',{title:"Adrress",includeCss:true,csspage:"address.css",addresses})
  }
  catch(err)
  {
    res.status(500).send("Error fetching address")
  }
}

//add new address
const addAddress = async (req, res) => {
  try {
    const { firstname, lastname, address, email, mobile, postalCode } = req.body;


    // Create new address
    const newAddress = new addressModel({
      firstname,
      lastname,
      email,
      mobile,
      address,
      postalCode
    });

    // Save the new address to the database
    await newAddress.save();

    
    return res.status(201).json({ message: 'Address added successfully' });
  } catch (error) {
    console.error(error);  // Log the error for debugging purposes
    return res.status(500).json({ error: 'Failed to add address' });
  }
};



 // Update address
const editAddress=async (req, res) => {
  try {
      await addressModel.findByIdAndUpdate(req.params.id, req.body);
      res.json({ message: 'Address updated successfully' });
  } catch (error) {
      res.status(500).json({ error: 'Failed to update address' });
  }
}

const deleteAddress=async (req, res) => {
  try {
      await addressModel.findByIdAndDelete(req.params.id);
      res.json({ message: 'Address deleted successfully' });
  } catch (error) {
      res.status(500).json({ error: 'Failed to delete address' });
  }
}


module.exports={loadAddress,addAddress,editAddress,deleteAddress}