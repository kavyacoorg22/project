

const loadAddress=async(req,res)=>{
  res.render('user/address',{title:"Adrress",includeCss:true,csspage:"address.css"})
}



module.exports={loadAddress}