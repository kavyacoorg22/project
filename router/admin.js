const express=require('express');
const router=express.Router();
const adminController=require('../controller/admincontroller/adminController');
const categoryController=require('../controller/admincontroller/categoryController')
const productController=require('../controller/admincontroller/productController')
const adminAuth=require('../middleware/adminAuth')
const upload=require("../utils/multer");
const validateImg=require('../middleware/validateImage')
const userController=require('../controller/admincontroller/userController')






router.post('/logout',adminController.logout)
router.get('/signup',adminAuth.isSignup,adminController.loadSignup)
router.post('/signup',adminController.signup)
router.get('/dashboard',adminAuth.checkSession,adminController.loadDashboard)

router.get('/category',adminAuth.checkSession,categoryController.getAllCategories)
router.get('/category/edit/:id',adminAuth.checkSession,categoryController.loadEditCat)
router.put('/category/edit/:id',adminAuth.checkSession,upload.single('image'),categoryController.updateCategory)
router.get('/category/create',adminAuth.checkSession,adminController.loadCreatecat)
router.post('/category', adminAuth.checkSession,upload.single('image'), categoryController.createcat)
router.delete('/category/delete/:id',adminAuth.checkSession,categoryController.deleteCat)


router.get('/product',adminAuth.checkSession,productController.loadproduct)
router.get('/product/add',adminAuth.checkSession,productController.loadAddproduct)
router.get('/product/edit/:id',adminAuth.checkSession,productController.loadEditproduct)
router.put('/product/edit/:id',adminAuth.checkSession,upload.single('image'),productController.editproduct)
router.post('/product',upload.array('images',10),validateImg,productController.product)
router.delete('/product/delete/:id',adminAuth.checkSession,productController.deleteProduct)



router.get('/user',adminAuth.checkSession,userController.loaduser)
router.post('/updateStatus',adminAuth.checkSession,userController.updateStatus)

router.use((err, req, res, next) => {
  console.error('Route error:', err);
  res.status(500).json({ error: err.message });
});

module.exports=router