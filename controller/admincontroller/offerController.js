
const loadAddOffer=async(req,res)=>{
  try{
    res.render('admin/addoffer',{ title:'addOffer',csspage:'addoffer.css',layout:'./layout/admin-layout.ejs'});
  }catch(err)
  {
    res.send(err)
  }
}

const loadOffer=async(req,res)=>{
  try{
    res.render('admin/offer',{ title:'Offer',csspage:'offer.css',layout:'./layout/admin-layout.ejs'});
  }catch(err)
  {
    res.send(err)
  }
}

const loadeditOffer=async(req,res)=>{
  try{
    res.render('admin/editOffer',{ title:'editOffer',csspage:'editOffer.css',layout:'./layout/admin-layout.ejs'});
  }catch(err)
  {
    res.send(err)
  }
}

const offer=async(req,res)=>{
  try{

  }catch(err)
  {

  }
}
module.exports={loadAddOffer,loadOffer,loadeditOffer,offer}