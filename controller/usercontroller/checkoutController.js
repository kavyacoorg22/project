

const loadCheckout=async(req,res)=>{
  res.render('user/checkout',{title:'Checkout',includeCss:false})
}

module.exports={loadCheckout}