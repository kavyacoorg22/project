const mongoose=require('mongoose');

const categorySchema=new mongoose.Schema({
  name:{
    type:String,
    required:true,
    default:"vegies"
  },
  image:{
    type:String,
  
    thumbnail:String
  },
  description:{
    type:String
  },
  createdBy:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'admin'
  },
  isDeleted:{
    type:Boolean,
    default:false
  },
  offers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'offer',
  }],
},{timestamps:true})

module.exports=mongoose.model('category',categorySchema)