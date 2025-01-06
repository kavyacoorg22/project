const userModel=require("../../model/userModel/signupModel")


const loaduser=async(req,res)=>
  {
    try{
      //const users=await userModel.find({})
       const page = parseInt(req.query.page) || 1; // Default to page 1
              const limit = 4; // user per page
              const skip = (page - 1) * limit;  //1-1*5=0 ,,,2-1*5=5
          
              // Fetch products with pagination
              const users = await userModel.find({ })
                                            .skip(skip)
                                            .limit(limit);
          
              // Total products for pagination
              const totalProducts = await userModel.countDocuments({});
              const totalPages = Math.ceil(totalProducts / limit);

      res.render('admin/user',{title:"user",csspage:"user.css",users,totalPages,page,layout: './layout/admin-layout'})  //user page
    }catch(err)
    {
      res.send(err.message)
    }
  }

  const updateStatus = async (req, res) => {
    const { userId, status } = req.body;

    try {
        // Validate inputs
        if (!userId || !['active', 'inactive'].includes(status)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid input parameters' 
            });
        }

        // Update the user's status in the database
        const user = await userModel.findByIdAndUpdate(
            userId,
            { status },
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Send success response
        res.json({
            success: true,
            message: `User ${status === 'active' ? 'unblocked' : 'blocked'} successfully`,
            user: {
                id: user._id,
                status: user.status
            }
        });

    } catch (error) {
        console.error('Error in updating status:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update user status. Please try again.' 
        });
    }
};


  module.exports={loaduser,updateStatus}