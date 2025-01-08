const express=require('express');
const router=express.Router();
const userAuthController=require('../controller/usercontroller/userAuthController')
const validateSignUpData=require('../middleware/signupvalidate')
const {userAuth}=require('../middleware/userAuth')
const homeController=require('../controller/usercontroller/homecontroller')
const reviewController=require('../controller/usercontroller/singlePoductController')



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

module.exports=router