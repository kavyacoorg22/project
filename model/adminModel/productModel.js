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
    ref:'admin',
  
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
  enum: ['In-stock', 'Out-of-stock'], 
  default: 'In-stock' 
},
stock:{
  type:Number,
  
},
isDeleted: { type: Boolean, default: false },
},{timestamps:true})

productShema.pre("save", function (next) {
  if (this.stock !== undefined) {
    this.status = this.stock > 0 ? "In-stock" : "Out-of-stock";
  }
  next();
});


module.exports=mongoose.model('product',productShema)