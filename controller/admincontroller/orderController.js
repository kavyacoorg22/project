

const loadOrder=async(req,res)=>{
  try{
    res.render('admin/order',{title:"order",csspage:"order.css" ,layout: './layout/admin-layout'})
  }catch(err)
  {
    res.status(500).send(err.message)
  }

 
}


module.exports={loadOrder}