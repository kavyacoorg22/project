

const loadCart=async(req,res)=>{
  res.render('user/cart',{title:'Cart',includeCss:false})
}

module.exports={loadCart}