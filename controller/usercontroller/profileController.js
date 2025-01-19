



const loadProfile=async(req,res)=>{
  try{
    res.render('user/profile',{title:"profile",includeCss:true,csspage:"profile.css"})
  }catch(err)
  {
    res.status(500).send(err.message)
  }

  
}



module.exports={loadProfile}