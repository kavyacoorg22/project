const orderModel=require('../../model/userModel/orderModel')
const Razorpay = require('razorpay');
const PDFDocument = require('pdfkit');

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






class InvoiceGenerator {
    constructor(order) {
        this.order = order;
    }

    generateHeader(doc) {
        doc
            .fillColor('#444444')
            .fontSize(20)
            .text('VEGEFOODS', 110, 57)
            .fontSize(10)
            .text('123 Business Street', 200, 65, { align: 'right' })
            .text('Madikeri, Karnataka, India', 200, 80, { align: 'right' })
            .moveDown();
    }

    generateCustomerInformation(doc) {
        doc
            .fontSize(20)
            .text('Invoice', 50, 160);

        this.generateHr(doc, 185);

        const customerInformationTop = 200;

        // Getting billing details from the order
        const customerName = `${this.order.billingDetails.firstName} ${this.order.billingDetails.lastName}`;
        const customerAddress = this.order.billingDetails.address;
        const customerEmail = this.order.billingDetails.email;
        const customerPhone = this.order.billingDetails.phone;

        doc
            .fontSize(10)
            .text('Invoice Number:', 50, customerInformationTop)
            .font('Helvetica-Bold')
            .text(this.order.orderID, 150, customerInformationTop)
            .font('Helvetica')
            .text('Date:', 50, customerInformationTop + 15)
            .text(new Date(this.order.orderDate).toLocaleDateString(), 150, customerInformationTop + 15)
            .text('Total Amount:', 50, customerInformationTop + 30)
            .text(`₹${this.order.totalAmount}`, 150, customerInformationTop + 30)
            .text('Payment Method:', 50, customerInformationTop + 45)
            .text(this.order.paymentMethod, 150, customerInformationTop + 45)
            .text('Order Status:', 50, customerInformationTop + 60)
            .text(this.order.status, 150, customerInformationTop + 60)

            .font('Helvetica-Bold')
            .text('Bill To:', 300, customerInformationTop)
            .font('Helvetica')
            .text(customerName, 300, customerInformationTop + 15)
            .text(customerAddress, 300, customerInformationTop + 30)
            .text(customerPhone, 300, customerInformationTop + 45)
            .text(customerEmail, 300, customerInformationTop + 60)
            .moveDown();

        this.generateHr(doc, 290);
    }

    generateTable(doc) {
        const invoiceTableTop = 330;

        doc.font('Helvetica-Bold');
        this.generateTableRow(
            doc,
            invoiceTableTop,
            'Product',
            'Status',
            'Quantity',
            'Unit Price',
            'Total'
        );

        this.generateHr(doc, invoiceTableTop + 20);
        doc.font('Helvetica');

        let position = invoiceTableTop + 30;

        this.order.orderedItem.forEach(item => {
            this.generateTableRow(
                doc,
                position,
                item.name,
                item.status,
                item.quantity,
                `₹${item.price}`,
                `₹${item.price * item.quantity}`
            );
            position += 30;
        });

        this.generateHr(doc, position + 20);

        const subtotalPosition = position + 40;
        doc.font('Helvetica-Bold');
        
        // Calculate subtotal from orderedItem array
        const subtotal = this.order.orderedItem.reduce((total, item) => total + (item.price * item.quantity), 0);
        
        doc
            .text('Subtotal:', 300, subtotalPosition)
            .text(`₹${subtotal}`, 400, subtotalPosition, { align: 'right' })
            .text('Discount:', 300, subtotalPosition + 20)
            .text(`₹${this.order.discount}`, 400, subtotalPosition + 20, { align: 'right' })
            .text('Shipping:', 300, subtotalPosition + 40)
            .text(`₹${this.order.deliveryCharge}`, 400, subtotalPosition + 40, { align: 'right' })
            .text('Total:', 300, subtotalPosition + 60)
            .text(`₹${this.order.totalAmount}`, 400, subtotalPosition + 60, { align: 'right' });

        // Add terms and conditions
        const termsPosition = subtotalPosition + 100;
        doc
            .font('Helvetica')
            .fontSize(10)
            .text('Terms and Conditions:', 50, termsPosition)
            .fontSize(8)
            .text('1. All items are non-refundable unless damaged or defective.', 50, termsPosition + 20)
            .text('2. Returns must be initiated within 7 days of delivery.', 50, termsPosition + 35)
            .text('3. Shipping charges are non-refundable.', 50, termsPosition + 50)
            .text('4. Please retain this invoice for future reference.', 50, termsPosition + 65);

        // Add footer
        const footerPosition = termsPosition + 100;
        doc
            .fontSize(10)
            .text('Thank you for shopping with VEGEFOODS!', 50, footerPosition, { align: 'center' })
            .fontSize(8)
            .text('This is a computer-generated invoice and does not require a signature.', 50, footerPosition + 15, { align: 'center' });
    }

    generateTableRow(doc, y, item, status, quantity, unitCost, lineTotal) {
        doc
            .fontSize(10)
            .text(item, 50, y)
            .text(status, 200, y)
            .text(quantity, 280, y, { width: 90, align: 'right' })
            .text(unitCost, 370, y, { width: 90, align: 'right' })
            .text(lineTotal, 0, y, { align: 'right' });
    }

    generateHr(doc, y) {
        doc
            .strokeColor('#aaaaaa')
            .lineWidth(1)
            .moveTo(50, y)
            .lineTo(550, y)
            .stroke();
    }

    generate() {
        const doc = new PDFDocument({ 
            margin: 50,
            size: 'A4'
        });

        this.generateHeader(doc);
        this.generateCustomerInformation(doc);
        this.generateTable(doc);

        return doc;
    }
}

// Route handler implementation
const invoice = async (req, res) => {
    try {
        const orderID = req.params.orderId;
        const order = await orderModel.findOne({ orderID: orderID });
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const invoiceGenerator = new InvoiceGenerator(order);
        const doc = invoiceGenerator.generate();

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Invoice-${orderID}.pdf`);

        // Pipe the PDF document to the response
        doc.pipe(res);
        doc.end();

    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).json({ message: 'Error generating invoice' });
    }
};



module.exports={loadOrderDetails,loadOrderHistory,loadOrderReturn,loadOrderCancel,cancelOrder,returnOrder,invoice}