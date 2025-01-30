const signupModel=require('../../model/userModel/signupModel')
const validator=require('validator')
const bcrypt=require('bcrypt')


const loadProfile=async(req,res)=>{
  try{
   
    const user=req.user;
    res.render('user/profile',{title:"profile",includeCss:true,csspage:"profile.css",user})
  }catch(err)
  {
    res.status(500).send(err.message)
  }
}


const updateProfile = async (req, res) => {
    try {
      const { firstname, email, secondEmail, number } = req.body;
      const userId = req.user._id;
  
      
      if (!firstname || !email || !number) {
        return res.status(400).json({ message: "Name, email, and phone number are required" });
      }
  
      
      if (!validator.isEmail(email)) {
        return res.status(400).json({ message: "Enter a valid email" });
      }
  
      
      if (secondEmail && !validator.isEmail(secondEmail)) {
        return res.status(400).json({ message: "Enter a valid secondary email" });
      }
  
      
      if (firstname.trim() === '') {
        return res.status(400).json({ message: "Name fields should not be empty or only spaces" });
      }
  
     
      if (!validator.isMobilePhone(number, 'any', { strictMode: false })) {
        return res.status(400).json({ message: "Enter a valid phone number" });
      }
  
     
      const conflictingUser = await signupModel.findOne({
        $or: [
          { email }, 
          { secondEmail } 
        ],
        _id: { $ne: userId } // Exclude current user
      });
  
      if (conflictingUser) {
        return res.status(400).json({
          message: "The entered email or secondary email is already in use",
        });
      }
  
      // Update user profile
      const updatedUser = await signupModel.findByIdAndUpdate(
        userId,
        {
          firstname:firstname.trim(),
          email,
          ...(secondEmail && { secondEmail }), // Include secondEmail only if provided
          number,
        },
        { new: true } // Return the updated document
      );
  
      if (!updatedUser) {
        return res.status(404).json({
          message: "User not found",
        });
      }
  
      res.json({
        message: "Profile updated successfully",
        user: updatedUser,
      });
  
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({
        message: "Server error while updating profile",
      });
    }
  };
  


const changePassword = async (req, res) => {
  try {
      const { password, newPassword, confirmPassword } = req.body;
      const userId = req.user._id;

      if (!password || !newPassword || !confirmPassword) {
          return res.status(400).json({ message: "All password fields are required" });
      }

      if (newPassword !== confirmPassword) {
          return res.status(400).json({ message: "New passwords do not match" });
      }

      // Password strength validation
      if (!validator.isStrongPassword(password)) {
          return res.status(400).json({ message: "Please enter a strong password with at least 8 characters, including uppercase, lowercase, numbers, and symbols."  });
      }

      // Get user and verify current password
      const user = await signupModel.findById(userId);
      if (!user) {
          return res.status(404).json({ message: "User not found" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
          return res.status(400).json({ message: "PAssword do not match"});
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await signupModel.findByIdAndUpdate(userId, { password: hashedPassword,
     
       });

      res.json({ message: "Password updated successfully" });

  } catch (error) {
      console.error('Password change error:', error);
      res.status(500).json({ message: "Server error while changing password" });
  }
};




const logout = (req, res) => {


  req.session.destroy((err) => {
    if (err) {
      console.error('Failed to destroy session:', err);
      return res.status(500).send('Failed to log out');
    }

    
  });
}
module.exports={loadProfile,updateProfile,changePassword,logout}