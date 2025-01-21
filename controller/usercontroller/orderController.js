

const loadOrderHistory=async(req,res)=>{
  try{
    res.render('user/orderHistory',{title:'OrderHistory',includeCss:true,csspage:'orderHistory.css'})
  }catch(err)
  {
    res.status(500).send(err.message)
  }
  
}

const loadOrderDetails=async(req,res)=>{
  try{
    res.render('user/orderDetails',{title:'OrderDetails',includeCss:true,csspage:'orderDetails.css'})
  }catch(err)
  {
    res.status(500).send(err.message)
  }
  
}


const loadOrderCancel=async(req,res)=>{
  try{
    res.render('user/orderCancel',{title:'cancelOrder',includeCss:true,csspage:'orderCancel.css'})
  }catch(err)
  {
    res.status(500).send(err.message)
  }
  
}


const loadOrderReturn=async(req,res)=>{
  try{
    res.render('user/orderReturn',{title:'ReturnOrder',includeCss:true,csspage:'orderReturn.css'})
  }catch(err)
  {
    res.status(500).send(err.message)
  }
  
}


module.exports={loadOrderDetails,loadOrderHistory,loadOrderReturn,loadOrderCancel}