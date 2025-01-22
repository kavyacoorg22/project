const express=require('express');
const router=express.Router();
const userAuthController=require('../controller/usercontroller/userAuthController')
const validateSignUpData=require('../middleware/signupvalidate')
const {userAuth}=require('../middleware/userAuth')
const homeController=require('../controller/usercontroller/homecontroller')
const reviewController=require('../controller/usercontroller/singlePoductController')
const addressController=require('../controller/usercontroller/addressController')
const cartController=require('../controller/usercontroller/cartController')
const checkoutController=require('../controller/usercontroller/checkoutController')
const profileController=require('../controller/usercontroller/profileController')
const addressvalidation=require('../middleware/addressValidation')
const orderController=require('../controller/usercontroller/orderController')
const passport = require('passport');
require('../utils/passport');



router.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/auth/google/callback',
  passport.authenticate('google', { 
    failureRedirect: '/user/login',
    successRedirect: '/user/home'
  })
);

router.use((req, res, next) => {
  // Get current URL path
  const currentPath = req.path.split('/').pop() || 'Home';
  
  // Make first letter uppercase and replace hyphens with spaces
  res.locals.currentPage = currentPath.charAt(0).toUpperCase() + 
                          currentPath.slice(1).replace(/-/g, ' ');
  next();
});


router.get('/signup',userAuthController.loadsignup)
router.post('/signup',validateSignUpData,userAuthController.signup)


router.get('/login',userAuthController.loadLogin)
router.post('/login',userAuthController.login)

router.get('/email',userAuthController.loademail)
router.post('/email',userAuthController.email)

router.get('/otp',userAuthController.loadotp)
router.post('/verifyotp',userAuthController.verifyotp)
router.post('/resendotp',userAuthController.resendotp)

router.get('/password',userAuthController.password)
router.post('/password',userAuthController.resetPassword)

router.get('/home',userAuth,homeController.home)

router.get('/shop',userAuth,homeController.shop)


router.get('/product/:id',userAuth,homeController.product)
router.get('/product/:productId/reviews',userAuth,reviewController.loadreviews)
router.post('/product/reviews',userAuth,reviewController.reviews)

router.get('/address',userAuth,addressController.loadAddress)
router.post('/address/add',addressvalidation,userAuth,addressController.addAddress)
router.put('/address/edit/:id',addressvalidation,userAuth,addressController.editAddress)
router.delete('/address/delete/:id',userAuth,addressController.deleteAddress)

router.get('/cart',userAuth,cartController.loadCart)
router.post('/cart/add',userAuth,cartController.addToCart)
router.post('/cart/updateQuantity',userAuth,cartController.updateQuantity)
router.post('/cart/removeProduct',userAuth,cartController.removeFromCart)



router.get('/checkout',userAuth,checkoutController.loadCheckout)

router.post('/placeOrder',addressvalidation,userAuth,checkoutController.placeOrder)

router.get('/profile',userAuth,profileController.loadProfile)
router.put('/profile/update',userAuth,profileController.updateProfile)
router.put('/profile/changePassword',userAuth,profileController.changePassword)


router.get('/orderHistory',userAuth,orderController.loadOrderHistory)
router.get('/orderDetails',userAuth,orderController.loadOrderDetails)
router.get('/orderCancel',userAuth,orderController.loadOrderCancel)
router.get('/orderReturn',userAuth,orderController.loadOrderReturn)


module.exports=router