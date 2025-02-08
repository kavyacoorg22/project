const express=require('express');
const router=express.Router();
const adminController=require('../controller/admincontroller/adminController');
const categoryController=require('../controller/admincontroller/categoryController')
const productController=require('../controller/admincontroller/productController')
const adminAuth=require('../middleware/adminAuth')
const upload=require("../utils/multer");
const validateImg=require('../middleware/validateImage')
const userController=require('../controller/admincontroller/userController')
const orderController=require('../controller/admincontroller/orderController')
const offerController=require('../controller/admincontroller/offerController')
const couponController=require('../controller/admincontroller/couponController')
const dashboardControlller=require('../controller/admincontroller/dashboardController')





router.post('/logout',adminController.logout)
router.get('/signup',adminAuth.isSignup,adminController.loadSignup)
router.post('/signup',adminController.signup)

router.get('/dashboard',adminAuth.checkSession,dashboardControlller.loadDashboard)


router.get('/top-categories', adminAuth.checkSession,dashboardControlller.topCategories)
router.get('/top-products',adminAuth.checkSession,dashboardControlller.topProducts)
router.get('/sales-data', adminAuth.checkSession,dashboardControlller.salesData);
router.get("/ledger-data", adminAuth.checkSession,dashboardControlller.ledgerData);


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



router.get('/order',adminAuth.checkSession,orderController.loadOrder)
router.post('/order/updateStatus/:orderId/:itemId',adminAuth.checkSession, orderController.updateStatus);
router.get('/order/viewOrder/:orderId', adminAuth.checkSession,orderController.viewOrder);

router.get('/offer/add',adminAuth.checkSession,offerController.loadAddOffer)
router.get('/offer',adminAuth.checkSession,offerController.loadOffer)
router.get('/offer/edit/:id',adminAuth.checkSession,offerController.loadeditOffer)
router.get('/offer/getApplicable/:type',adminAuth.checkSession,offerController.getApplicable) 
router.post('/offer/add',adminAuth.checkSession,offerController.addoffer)
router.post('/offer/edit/:id',adminAuth.checkSession,offerController.editOffer)
router.patch('/offer/updateStatus/:id',adminAuth.checkSession, offerController.updateStatus);

router.get('/coupon/add',adminAuth.checkSession,couponController.loadAddCoupon)
router.get('/coupon',adminAuth.checkSession,couponController.loadCoupon)
router.post('/coupon/add',adminAuth.checkSession,couponController.addCoupon)
router.patch('/coupon/updateStatus/:couponId',adminAuth.checkSession,couponController.changeStatus)
router.delete('/coupon/:couponId',adminAuth.checkSession,couponController.deleteCoupon)


router.use((err, req, res, next) => {
  console.error('Route error:', err);
  res.status(500).json({ error: err.message });
});

module.exports=router