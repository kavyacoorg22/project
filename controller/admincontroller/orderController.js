const orderModel = require('../../model/userModel/orderModel')
const productModel=require('../../model/adminModel/productModel')
const walletModel=require('../../model/userModel/walletModel')

const loadOrder = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 2;
    const skip = (page - 1) * limit;

    
    const orders = await orderModel.find({})
      .populate({
        path: 'user',
        select: 'firstname', 
        options: { lean: true } 
      })
      .populate({
        path: 'orderedItem.product',
        select: 'name firstImage', 
      })
      .sort({ orderDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean(); // Use lean to get plain JavaScript objects


    const processedOrders = orders.map(order => ({
      ...order,
      userId: {
        firstname: order.userId?.firstname || 'Unknown User' 
      }
    }));

    const totalorder = await orderModel.countDocuments({});
    const totalPages = Math.ceil(totalorder / limit);

    res.render('admin/order', {
      title: "Orders",
      csspage: "order.css",
      layout: './layout/admin-layout',
      orders: processedOrders,
      totalPages,
      page
    });
  } catch (err) {
    console.error('Error loading orders:', err);
    res.status(500).send('Error loading orders. Please try again.');
  }
};


const handleRefundAndQuantityUpdate = async (orderId, itemId, status, updatedItem) => {
  try {
    console.log('Starting handleRefundAndQuantityUpdate with:', {
      orderId,
      itemId,
      status,
      updatedItem
    });


    if (status === 'canceled' || status === 'returned') {
     
      const productBefore = await productModel.findById(updatedItem.product);
      console.log('Product before update:', productBefore);

      const updatedProduct = await productModel.findOneAndUpdate(
        { _id: updatedItem.product }, 
        { 
          $inc: { 
            quantity: updatedItem.quantity,
            stock: updatedItem.quantity 
          }
        },
        { new: true }
      );

      console.log('Product after update:', updatedProduct);
    }

    // Handle refund logic
    const order = await orderModel.findOne({ orderID: orderId });
    if (order.paymentMethod === 'wallet' || order.paymentMethod === 'razorpay') {
      const refundAmount = updatedItem.price * updatedItem.quantity;

      if (order.paymentMethod === 'wallet') {
        const walletBefore = await walletModel.findOne({ user: order.user });
        console.log('Wallet before update:', walletBefore);

        const updatedWallet = await walletModel.findOneAndUpdate(
          { user: order.user },
          {
            $inc: { balance: refundAmount },
            $push: {
              transactions: {
                transactionType: 'deposit',
                amount: refundAmount,
                date: new Date()
              }
            }
          },
          { new: true }
        );

        console.log('Wallet after update:', updatedWallet);
      }
    }
  } catch (error) {
    console.error('Error in handleRefundAndQuantityUpdate:', error);
    throw error;
  }
};

const updateStatus = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { status } = req.body;

    console.log('Updating status for:', {
      orderId,
      itemId,
      status
    });

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
      console.log('Order or Item not found');
      return res.status(404).json({ 
        success: false, 
        message: 'Order or Item not found' 
      });
    }

    console.log('Updated order:', updatedOrder);

    const updatedItem = updatedOrder.orderedItem.find(
      item => item._id.toString() === itemId
    );
    
    console.log('Found updated item:', updatedItem);

    // Check if all items are canceled or returned
    const allItemsCanceledOrReturned = updatedOrder.orderedItem.every(
      item => item.status === 'canceled' || item.status === 'returned'
    );

    if (allItemsCanceledOrReturned) {
      const newOrderStatus = updatedOrder.orderedItem.some(
        item => item.status === 'canceled'
      ) ? 'canceled' : 'returned';

      await orderModel.findOneAndUpdate(
        { orderID: orderId },
        { $set: { status: newOrderStatus } }
      );
    }

    // Handle refund and quantity update
    await handleRefundAndQuantityUpdate(orderId, itemId, status, updatedItem);

    res.json({ 
      success: true, 
      message: 'Item status updated', 
      item: updatedItem 
    });

  } catch (error) {
    console.error('Error in updateStatus:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating item status', 
      error: error.message 
    });
  }
};

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