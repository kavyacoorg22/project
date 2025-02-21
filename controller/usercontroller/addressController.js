const addressModel=require('../../model/userModel/addressModel')
const signupModel=require('../../model/userModel/signupModel')
const validator=require('validator')



const loadAddress = async (req, res) => {
  try {
      
      const userId = req.user._id;
      
      // Find the user and populate their addresses
      const user = await signupModel
          .findById(userId)
          .populate('address')
          .exec();
      
      if (!user) {
          return res.status(404).send("User not found");
      }

      // Send only the user's addresses
      const addresses = user.address || [];
      
      res.render('user/address', {
          title: "Address",
          includeCss: true,
          csspage: "address.css",
          addresses
      });
  } catch (err) {
      
      res.status(500).send("Error fetching addresses");
  }
};

//add new address
const addAddress = async (req, res) => {
  try {
    const userId=req.user._id;
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
    
     // Update user's addresses array
     await signupModel.findByIdAndUpdate(
      userId,
      {
          $push: { address: newAddress._id }
      },
      { new: true }
  );
    
  res.status(200).json({
    success: true,
    message: "Address added successfully"
});
  } catch (error) {
   
    res.status(500).json({
        success: false,
        message: "Error adding address"
    });
  }
};



 // Update address
// Backend controller
const editAddress = async (req, res) => {
  try {
      const addressId = req.params.id;
      const userId = req.user._id;

      // Verify this address belongs to the user
      const user = await signupModel.findById(userId);
      if (!user.address.includes(addressId)) {
          return res.status(403).json({ message: 'Not authorized to edit this address' });
      }

      // Validate input data
      const { firstname, lastname, address, email, mobile, postalCode } = req.body;
      
      

      // Update the address
      const updatedAddress = await addressModel.findByIdAndUpdate(
          addressId,
          {
              firstname,
              lastname,
              address,
              email,
              mobile,
              postalCode
          },
          { new: true, runValidators: true }
      );

      if (!updatedAddress) {
          return res.status(404).json({ message: 'Address not found' });
      }

      res.json({ 
          message: 'Address updated successfully',
          address: updatedAddress 
      });

  } catch (error) {
     
      res.status(500).json({ message: 'Failed to update address' });
  }
};
const deleteAddress = async (req, res) => {
  try {
      const userId = req.user._id;
      const addressId = req.params.id;
   

      // Remove address from user's addresses array
      await signupModel.findByIdAndUpdate(
        userId,
        { $pull: { address: addressId } },
        { new: true } 
      );

      // Delete the address document
      await addressModel.findByIdAndDelete(addressId);

      res.status(200).json({
          success: true,
          message: "Address deleted successfully"
      });
  } catch (err) {
     
      res.status(500).json({
          success: false,
          message: "Error deleting address"
      });
  }
};


module.exports={loadAddress,addAddress,editAddress,deleteAddress}