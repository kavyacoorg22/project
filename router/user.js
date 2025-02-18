const express=require('express');
const router=express.Router();
const userAuthController=require('../controller/usercontroller/userAuthController')
const validateSignUpData=require('../middleware/signupvalidate')
const {userAuth,checkLoginPage}=require('../middleware/userAuth')
const homeController=require('../controller/usercontroller/homecontroller')
const reviewController=require('../controller/usercontroller/singlePoductController')
const addressController=require('../controller/usercontroller/addressController')
const cartController=require('../controller/usercontroller/cartController')
const checkoutController=require('../controller/usercontroller/checkoutController')
const profileController=require('../controller/usercontroller/profileController')
const addressvalidation=require('../middleware/addressValidation')
const orderController=require('../controller/usercontroller/orderController')
const wishlistController=require('../controller/usercontroller/wishlistController')
const walletController=require('../controller/usercontroller/walletController')
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


router.get('/signup',checkLoginPage,userAuthController.loadsignup)
router.post('/signup',validateSignUpData,userAuthController.signup)


router.get('/login',checkLoginPage,userAuthController.loadLogin)
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
router.post('/applyCoupon',userAuth,cartController.applyCoupon)
router.post('/remove-coupon', userAuth, cartController.removeCoupon);



router.get('/checkout',userAuth,checkoutController.loadCheckout)
router.get('/check-wallet-balance',userAuth, checkoutController.checkWalletBalance);
router.post('/verify-payment',userAuth,checkoutController.verifyPayment);
router.post('/placeOrder',userAuth,checkoutController.placeOrder)
router.get('/orderSuccess/:id',userAuth,checkoutController.loadSuccessPage)

router.post('/retry-payment', userAuth,checkoutController.retryPayment);
router.post('/verifyRepayment', userAuth,checkoutController.verifyRepayment);


router.get('/orderFailed/:id',userAuth,checkoutController.loadFailedPage)


router.get('/profile',userAuth,profileController.loadProfile)
router.put('/profile/update',userAuth,profileController.updateProfile)
router.put('/profile/changePassword',userAuth,profileController.changePassword)
router.post('/logout',profileController.logout)


router.get('/orderHistory',userAuth,orderController.loadOrderHistory)
router.get('/orderDetails/:id',userAuth,orderController.loadOrderDetails)
router.get('/cancelOrder/:orderID/:productId',userAuth,orderController.loadOrderCancel)
router.get('/returnOrder/:orderID/:productId',userAuth,orderController.loadOrderReturn)
router.post('/cancelOrder/:orderID/:productId',userAuth,orderController.cancelOrder)
router.post('/returnOrder/:orderID/:productId',userAuth,orderController.returnOrder)
router.get('/order/:orderId/invoice',userAuth,orderController.invoice) 


router.get('/wishlist',userAuth,wishlistController.loadWishlist)
router.post('/wishlist/add/:productId',userAuth,wishlistController.addWishlist)
router.delete('/wishlist/remove/:productId',userAuth,wishlistController.removeFromWishlist)


router.get('/wallet',userAuth,walletController.loadWallet)
router.post('/wallet/add',userAuth,walletController.addWallet)

router.use((req, res) => {
  res.status(404).render('user/error', {
    title: '404 - Page Not Found',
    originalUrl: req.originalUrl,
    includeCss: true,
    csspage: "error.css",
    layout:"./layout/auth-layout"
  });
});

module.exports=router