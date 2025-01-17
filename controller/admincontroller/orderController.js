

const loadOrder=async(req,res)=>{
  res.render('admin/order',{title:"order",csspage:"order.css" ,layout: './layout/admin-layout'})
}


module.exports={loadOrder}