const cartModel=require('../../model/userModel/cartModel')

const loadCart=async(req,res)=>{
  try{
    res.render('user/cart',{title:'Cart',includeCss:false})
  }catch(err)
  {
    res.status(500).send(err.message)
  }

}

module.exports={loadCart}