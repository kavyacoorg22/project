const mongoose=require("mongoose");


const productShema=new mongoose.Schema({
  name:{
    type:String,
    required:true,
  },
  images:{
    type:[String],
    required:true,
    
  },
  price:{
    type:Number,
    required:true,
  },
  description:{
    type:String
  },
  quantity:{
    type:Number,
    required:true
  },
  createdBy:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'signin',
  
  },
  offers: [{
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'offer', 
   }],
   category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'category', 
    required: true,
},
status: { 
  type: String, 
  enum: ['active', 'inactive'], 
  default: 'active' 
},
isDeleted: { type: Boolean, default: false },
},{timestamps:true})

module.exports=mongoose.model('product',productShema)