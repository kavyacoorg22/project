const orderModel = require('../../model/userModel/orderModel')
const productModel=require('../../model/adminModel/productModel')

const loadOrder = async (req, res) => {
  try {

     const page = parseInt(req.query.page) || 1; // Default to page 1
                const limit = 2; // Products per page
                const skip = (page - 1) * limit;  //1-1*3=0 ,,,2-1*3=3
            
       
                const orders = await orderModel.find({})
                                             .populate('user', 'firstname')
                                              .sort({ orderDate: -1 })
                                              .skip(skip)
                                              .limit(limit);
            
                // Total products for pagination
                const totalorder = await orderModel.countDocuments({});
                const totalPages = Math.ceil(totalorder / limit);
    
    
    res.render('admin/order', {
      title: "Orders", 
      csspage: "order.css", 
      layout: './layout/admin-layout', 
      orders,
      totalPages,
      page
    });
  } catch (err) {
    res.status(500).send(err.message)
  }
}

const updateStatus = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { status } = req.body;

    const updatedOrder = await orderModel.findOneAndUpdate(
      { 
        orderID: orderId, 
        'orderedItem._id': itemId 
      },
      { 
        $set: { 
          'orderedItem.$.status': status 
        } 
      },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order or Item not found' 
      });
    }
//find perticular product
    const updatedItem = updatedOrder.orderedItem.find(
      item => item._id.toString() === itemId
    );
    
   
     // Check if all items are canceled or returned
     const allItemsCanceledOrReturned = updatedOrder.orderedItem.every(
      item => item.status === 'canceled' || item.status === 'returned'
    );

    // Update order status if all items are canceled/returned
    if (allItemsCanceledOrReturned) {
      const newOrderStatus = updatedOrder.orderedItem.some(
        item => item.status === 'canceled'
      ) ? 'canceled' : 'returned';

      await orderModel.findOneAndUpdate(
        { orderID: orderId },
        { $set: { status: newOrderStatus } }
      );
    }

  

    res.json({ 
      success: true, 
      message: 'Item status updated', 
      item: updatedItem 
    });


    if (status === 'canceled') {
     
      await productModel.findOneAndUpdate(
          { _id: updatedItem.productId },
          { 
            $inc: { quantity: updatedItem.quantity },
            $inc:{stock:updatedItem.quantity}
          },
          { new: true }
        );
      }
  

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error updating item status', 
      error: error.message 
    });
  }
}

const viewOrder=async(req,res)=>{
  
   try {
     
      const orderId = req.params.orderId;
      const orders = await orderModel.findOne({ orderID: orderId })
        .populate('deliveryAddress')
        .populate('user','firstname number ')
        .populate('billingDetails')
        
      if (!orders) {
        return res.status(404).send('Order not found');
      }
      
      res.render('admin/viewOrder',{title:"ViewOrder",csspage:"viewOrder.css",orders,layout: './layout/admin-layout',})
    } catch (err) {
      res.status(500).send(err.message);
    }
}


module.exports = { loadOrder, updateStatus, viewOrder }