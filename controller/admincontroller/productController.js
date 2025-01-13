const productModel=require('../../model/adminModel/productModel')
const {processImage}=require('../../utils/productImgProcessor')
const categoryModel=require('../../model/adminModel/categoryModel')
const path=require('path');
const fs=require('fs').promises;



const loadproduct=async(req,res)=>
  {
    try{
    
        const page = parseInt(req.query.page) || 1; // Default to page 1
        const limit = 3; // Products per page
        const skip = (page - 1) * limit;  //1-1*3=0 ,,,2-1*3=3
    
        // Fetch products with pagination
        const products = await productModel.find({ isDeleted: false })
                                      .skip(skip)
                                      .limit(limit);
    
        // Total products for pagination
        const totalProducts = await productModel.countDocuments({ isDeleted: false });
        const totalPages = Math.ceil(totalProducts / limit);
    
        // Render the products and pagination
        res.render('admin/product', { products, page, totalPages,title:'product',csspage:"product.css" ,layout: './layout/admin-layout'});
    
    
    
    }catch(err)
    {
       res.send(err.message)
    }
  }
const loadAddproduct=async(req,res)=>

    {
      try{
        const categories=await categoryModel.find()
        const product=await productModel.find({})
        res.render('admin/addproducts',{title:"addproduct",csspage:"addproduct.css" ,categories,layout: './layout/admin-layout',product})  //user page
      }catch(err)
      {
        res.send(err.message)
      }
    }


const loadEditproduct=async(req,res)=>
{
 try{
  console.log("id",req.params.id)
    const {id}=req.params;
    console.log(req.params)
    const product=await productModel.findById(id)
    const categories=await categoryModel.find({})
    if(!product)
    {
      return res.send("product not found")
    }
    
    res.render('admin/editproduct',{title:"editproduct",csspage:"editproduct.css", product,layout: './layout/admin-layout',categories})  //Edit products
   }catch(err)
   {
    res.send(err.message)
   }
 }

 const product = async (req, res) => {
  try {
    
      const { name, description, category, price, quantity, status} = req.body;
     
      if (!name || !description || !category || !price || !quantity || !status) {
          return res.status(400).json({
              success: false,
              message: 'All fields are required'
          });
      }

      if (name.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Name should not be empty or only spaces.',
        });
      }
  
      if (description.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Description should not be empty or only spaces.',
        });
      }
  

      if (price<= 0 || quantity<= 0) {
          return res.status(400).json({
              success: false,
              error: "Price and quantity must be positive numbers"
          });
      }
       
      if (!req.files || req.files.length < 3) {
        return res.status(400).json({
          success: false,
          message: 'At least 3 images are  required.',
        });
      }

      const images = await Promise.all(
          req.files.map(file => processImage(file.buffer, file.originalname))
      );

      const product = new productModel({
          name,
          description,
          category,
          price,
          quantity,
          status,
          images
      });

      await product.save();
      
      // Sends success message 
      res.json({
          success: true,
          message: 'Product added successfully'
      });

  } catch (err) {
      console.log(err.message);
      res.status(400).json({
          success: false,
          error: err.message
      });
  }
};


const deleteProduct = async (req, res) => {
  const { id } = req.params;


  try {
      
      const product = await productModel.findOne({ _id: id  });
      

      if (!product) {
          return res.status(404).json({ message: 'Product not found' });
      }

      // Soft delete the product
     const result= await productModel.updateOne(
          { _id: id},
          { $set: { isDeleted: true } }
      );
      console.log(`Update result:`, result);
      res.status(200).json({ message: 'Product soft deleted successfully' });
  } catch (err) {
      console.error('Error during product deletion:', err.message);
      res.status(500).json({ message: 'Failed to delete product' });
  }
};


const editproduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, price, quantity, status } = req.body;

    // Validate required fields
    if (!name || !description || !category || !price || !quantity || !status) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Find the product
    const product = await productModel.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    let updateData = {
      name,
      description,
      category,
      price: Number(price),
      quantity: Number(quantity),
      status
    };

    // Handle image upload
    if (req.file) {
      try {
        // Delete old image if it exists
        if (product.images && product.images.length > 0) {
          const oldImagePath = path.join('public', 'img', 'productsimg', product.images[0]);
          try {
            await fs.promises.access(oldImagePath);
            await fs.promises.unlink(oldImagePath);
          } catch (err) {
            console.log('No old image found to delete');
          }
        }

        // Process new image
        const filename = await processImage(
          req.file.buffer,
          req.file.originalname
        );

        // Properly update the images array
        // If product doesn't have images array, initialize it
        if (!product.images) {
          updateData.images = [filename];
        } else {
          // Replace first image or add if array is empty
          updateData.images = [...product.images];
          updateData.images[0] = filename;
        }
      } catch (error) {
        console.error('Image processing error:', error);
        return res.status(500).json({
          success: false,
          message: 'Error processing image: ' + error.message
        });
      }
    }

    // Update product
    const updatedProduct = await productModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product updated successfully',
      product: updatedProduct
    });

  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while updating product: ' + error.message
    });
  }
};

module.exports={loadAddproduct,loadEditproduct,loadproduct,product,deleteProduct,editproduct}