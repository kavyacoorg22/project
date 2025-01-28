const orderModel=require('../../model/userModel/orderModel')


const loadOrderHistory = async (req, res) => {
  try {
      const userId = req.user._id;

      const orders = await orderModel.find({ user: userId })
          .sort({ orderDate: -1 });

      const processedOrders = orders.map(order => ({
          productCount: order.orderedItem.length,
          orderId: order.orderID,
          date: new Date(order.orderDate).toLocaleString(),
          total: order.totalAmount,
          discount: order.discount,
          status: order.status
      }));

      const failedOrders = processedOrders.filter(order => 
          ['canceled', 'returned', 'Payment Pending'].includes(order.status)
      );

      const placedOrders = processedOrders.filter(order => 
          !['canceled', 'returned', 'Payment Pending'].includes(order.status)
      );

      res.render('user/orderHistory', {
          title: 'Order History',
          includeCss: true,
          csspage: 'orderHistory.css',
          failedOrders,
          placedOrders
      });

  } catch (err) {
      console.error('Error loading order history:', err);
      res.status(500).render('error', {
          message: 'Error loading order history',
          error: err
      });
  }
};

const loadOrderDetails = async (req, res) => {
  try {
   
    const orderId = req.params.id;
    const orders = await orderModel.findOne({ orderID: orderId })
      .populate('deliveryAddress')
      .populate('user','firstname number ')
      .populate('billingDetails')
      
    if (!orders) {
      return res.status(404).send('Order not found');
    }
    
    res.render('user/orderDetails', {
      title: 'OrderDetails',
      includeCss: true,
      csspage: 'orderDetails.css',
      orders
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
};

const loadOrderCancel = async (req, res) => {
  try {
    const { orderID, productId } = req.params;
    res.render('user/orderCancel', {
      title: 'cancelOrder', 
      includeCss: true, 
      csspage: 'orderCancel.css', 
      orderID, 
      productId
    });
  } catch(err) {
    res.status(500).send(err.message);
  }
};

const cancelOrder = async (req, res) => {
  try {
    console.log("returm",req.params)
    const { orderID, productId } = req.params;
    const { cancelReason } = req.body;
    console.log(req.body)

    if (!orderID || !productId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid order or product ID' 
      });
    }

    const order = await orderModel.findOneAndUpdate(
      { 
        orderID: orderID,
        'orderedItem.product': productId,
      
        
      },
      { 
        $set: { 
          'orderedItem.$.status': 'cancel request',
          'orderedItem.$.cancelReason': cancelReason,
          
        }
      },
      { new: true }
    );

    if (!order) {
      return res.status(400).json({ 
        success: false, 
        message: 'Product cannot be cancelled at this stage' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Product cancellation request submitted' 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during product cancellation' 
    });
  }
};

const loadOrderReturn=async(req,res)=>{
  try{
  
    const { orderID, productId } = req.params;
    res.render('user/orderReturn',{title:'ReturnOrder',includeCss:true,csspage:'orderReturn.css',orderID, 
      productId})
  }catch(err)
  {
    res.status(500).send(err.message)
  }
  
}

const returnOrder = async (req, res) => {
  try {
    
    const { orderID, productId } = req.params;
    const { returnReason } = req.body;
  
    

    if (!orderID || !productId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid order or product ID' 
      });
    }

    const order = await orderModel.findOneAndUpdate(
      { 
        orderID: orderID,
        'orderedItem.product': productId,
      
        
      },
      { 
        $set: { 
          'orderedItem.$.status': 'Return Request',
          'orderedItem.$.returnReason': returnReason,
          
        }
      },
      { new: true }
    );

    if (!order) {
      return res.status(400).json({ 
        success: false, 
        message: 'Product cannot be retured' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Product return request submitted' 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};




module.exports={loadOrderDetails,loadOrderHistory,loadOrderReturn,loadOrderCancel,cancelOrder,returnOrder}