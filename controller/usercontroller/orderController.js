const orderModel=require('../../model/userModel/orderModel')


const loadOrderHistory = async (req, res) => {
  try {
      // Get user ID from the session/request
      const userId = req.user._id;

      // Fetch all orders for the user
      const orders = await orderModel.find({ user: userId })
          .populate('products.product')  // Populate product details
          .sort({ orderDate: -1 })      // Sort by newest first
          .lean();  

      // Process orders to match the template format
      const processedOrders = orders.map(order => ({
          productCount: order.products.length,
          orderId: order.orderID,
          date: new Date(order.orderDate).toLocaleString(),
          total: order.totalAmount,
          discount: order.discount,
          status: order.status
      }));

      // Separate orders by status
      const failedOrders = processedOrders.filter(order => 
          ['cancel', 'returned','Payment Pending'].includes(order.status)
      );

      const placedOrders = processedOrders.filter(order => 
          !['cancel', 'returned','Payment Pending'].includes(order.status)
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
    console.log(req.params.id)
    const orderId = req.params.id;
    const orders = await orderModel.findOne({ orderID: orderId })
      .populate('products.product')
      .populate('deliveryAddress', 'firstname lastname address postalCode mobile email') 
      .populate('user','firstname lastname number')
      
      
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

const loadOrderCancel=async(req,res)=>{
  try{
    res.render('user/orderCancel',{title:'cancelOrder',includeCss:true,csspage:'orderCancel.css'})
  }catch(err)
  {
    res.status(500).send(err.message)
  }
  
}


const loadOrderReturn=async(req,res)=>{
  try{
    res.render('user/orderReturn',{title:'ReturnOrder',includeCss:true,csspage:'orderReturn.css'})
  }catch(err)
  {
    res.status(500).send(err.message)
  }
  
}


module.exports={loadOrderDetails,loadOrderHistory,loadOrderReturn,loadOrderCancel}