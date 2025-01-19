const  mongoose=require('mongoose')

const addressSchema=new mongoose.Schema({
 firstname:{
  type:String,
  required:true,
  minlength: 2, // Minimum length for address
  maxlength:10,
 },
 lastname:{
  type:String,
  required:true,
  minlength: 2, 
  maxlength: 10,
 },
 address:{
  type:String,
  required:true,
  minlength: 20, 
  maxlength: 100,
 },
 email:{
  type:String,
  required:true
 },
 mobile:{
  type:Number,
  required:true
 },
 postalCode:{
  type:Number,
  required:true
 }

},{timestamps:true})

module.exports=mongoose.model('address',addressSchema)