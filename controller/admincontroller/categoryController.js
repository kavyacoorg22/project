const categoryModel = require('../../model/adminModel/categoryModel');
const { processImage } = require('../../utils/imageProceesor');
const path = require('path');
const fs = require('fs').promises;

const createcat = async (req, res) => {
  try {
    console.log(req.body)
    const { name, description } = req.body;

    if (!name || !description) {
      return res.status(400).json({
        sucess:false,
        message:"Should enter name and description"
      })
    }

   if(name.trim()===''||description.trim()==='')
   {
     return res.status(400).json({
      success:false,
      message:"Name and Description should not be empty or black space"
     })
   }


    let imageUrl = null;
    if (req.file) {
      const filename = await processImage(req.file.buffer, req.file.originalname);
      imageUrl = `/img/categories/${filename}`;
  } else {
      console.log('No file uploaded');
  }
  

    const category = new categoryModel({ name, description, image: imageUrl });
    console.log("data",category)
    await category.save();
    res.json({
      success: true,
      message: 'Product added successfully'
  });

  } catch (error) {
    console.error('Error creating category:', error);
    res.render('admin/createcategory', {
      error: 'Error creating category',
      values: req.body,
      title:"createcategory",
      csspage:"createcategory.css",
      layout: './layout/admin-layout'
    });
  }
};

const getAllCategories = async (req, res) => {
  try {
   
     const page = parseInt(req.query.page) || 1; // Default to page 1
            const limit = 3; // Products per page
            const skip = (page - 1) * limit;  //1-1*3=0 ,,,2-1*3=3
        
   
            const categories= await categoryModel.find({isDeleted:false})
                                          .skip(skip)
                                          .limit(limit);
        
            // Total products for pagination
            const totalcategory = await categoryModel.countDocuments({isDeleted:false});
            const totalPages = Math.ceil(totalcategory / limit);
    res.render('admin/category', {
      
      title: 'Categories',
      csspage: 'category.css',
      layout: './layout/admin-layout',
      page,
      totalPages,
      categories,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching categories');
  }
};

const updateCategory = async (req, res) => {
  try {
      const { id } = req.params;
      const { name, description } = req.body;

      // Find the category
      const category = await categoryModel.findById(id);
      if (!category) {
          return res.status(404).json({
              success: false,
              message: 'Category not found'
          });
      }

      let updateData = {
          name,
          description,
          updatedAt: new Date()
      };

      // Handle image upload
      if (req.file) {
          try {
              // Create categories directory if it doesn't exist
              const uploadDir = path.join('public', 'img', 'categories');
              await fs.mkdir(uploadDir, { recursive: true });

              // Delete old image if it exists
              if (category.image) {
                  const oldImagePath = path.join('public', category.image);
                  try {
                      await fs.access(oldImagePath);
                      await fs.unlink(oldImagePath);
                  } catch (err) {
                      console.log('No old image found to delete');
                  }
              }

              // Process new image
              const filename = await processImage(
                  req.file.buffer,
                  req.file.originalname
              );

              // Add image path to update data
              updateData.image = `/img/categories/${filename}`;
          } catch (error) {
              console.error('Image processing error:', error);
              return res.status(500).json({
                  success: false,
                  message: 'Error processing image',
                  error: error.message
              });
          }
      }

    
      await categoryModel.findByIdAndUpdate(
          id,
          updateData,
          { new: true, runValidators: true }
      );


      return res.redirect('/admin/category');

  } catch (error) {
      console.error('Error updating category:', error);
      return res.status(500).json({
          success: false,
          message: 'Internal server error while updating category',
          error: error.message
      });
  }
};



const deleteCat=async(req,res)=>{
  const { id } = req.params;
  
  
    try {
        
        const category = await categoryModel.findOne({ _id: id  });
        
  
        if (!category) {
            return res.status(404).json({ message: 'chategorynot found' });
        }
  
        // Soft delete the category
       const result= await categoryModel.updateOne(
            { _id: id},
            { $set: { isDeleted: true } }
        );
        console.log(`Update result:`, result);
        res.status(200).json({ message: 'Category soft deleted successfully' });
    } catch (err) {
        console.error('Error during category deletion:', err.message);
        res.status(500).json({ message: 'Failed to delete category' });
    }
  
}

const loadEditCat = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await categoryModel.findById(id);

    if (!category) {
      return res.status(404).send('Category not found');
    }

    res.render('admin/editcategory', { title: 'Edit Category', category ,csspage:"editcategory.css",layout: './layout/admin-layout'});
  } catch (err) {
    console.error('Error loading category:', err);
    res.status(500).send('Internal Server Error');
  }
};

module.exports = { getAllCategories, createcat, updateCategory , deleteCat ,loadEditCat};
