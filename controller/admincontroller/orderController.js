const orderModel = require('../../model/userModel/orderModel')

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
                const totalorder = await orderModel.countDocuments({isDeleted:false});
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

    const updatedItem = updatedOrder.orderedItem.find(
      item => item._id.toString() === itemId
    );

    res.json({ 
      success: true, 
      message: 'Item status updated', 
      item: updatedItem 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error updating item status', 
      error: error.message 
    });
  }
}

const deleteOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const deletedOrder = await orderModel.findOneAndDelete({ orderID: orderId });

    if (!deletedOrder) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Order deleted successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting order', 
      error: error.message 
    });
  }
}

module.exports = { loadOrder, updateStatus, deleteOrder }