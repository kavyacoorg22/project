

const loadCheckout=async(req,res)=>{
  try{
    res.render('user/checkout',{title:'Checkout',includeCss:false})
  }catch(err)
  {
    res.status(500).send(err.message)
  }
  
}

module.exports={loadCheckout}