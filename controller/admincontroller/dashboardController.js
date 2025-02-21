const moment = require("moment");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const Order = require("../../model/userModel/orderModel");





const loadDashboard = async (req, res) => {
  try {
    
    const start = moment().startOf("month").toDate();
    const end = moment().endOf("month").toDate();

    // Fetch order statistics with proper handling of orderedItem array and coupons
    const salesData = await Order.aggregate([
      {
        $match: {
          orderDate: { $gte: start, $lte: end },
          status: { $nin: ["Canceled", "Returned", "Cancel Request", "Return Request","Payment Pending"] }
        }
      },
      { $unwind: "$orderedItem" },
  
      {
        $lookup: {
          from: "coupons",
          localField: "couponCode", //order
          foreignField: "couponCode", //coupon
          as: "coupon"
        }
      },
      
      { $unwind: { path: "$coupon", preserveNullAndEmptyArrays: true } },
  
      {
        $addFields: {
          itemDiscount: {
            $cond: [
              { $and: [
                { $gt: ["$coupon.discount", 0] },
                { $gte: ["$orderedItem.price", "$coupon.minimumPurchase"] }
              ]},
              { $divide: [
                { $multiply: ["$orderedItem.price", "$orderedItem.quantity", "$coupon.discount"] },
                100
              ]},
              0
            ]
          },
          itemCouponDeduction: {
            $cond: [
              { $and: [
                { $gt: ["$coupon.discount", 0] },
                { $gte: ["$orderedItem.price", "$coupon.minimumPurchase"] }
              ]},
              { $multiply: ["$orderedItem.quantity", "$orderedItem.price"] },
              0
            ]
          }
        }
      },
      // Group by date to get daily totals
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$orderDate" } },
          ordersCount: { $addToSet: "$orderID" }, // Count unique orders
          revenue: { $sum: { $multiply: ["$orderedItem.price", "$orderedItem.quantity"] } },
          discount: { $sum: "$itemDiscount" },
          couponDeduction: { $sum: "$itemCouponDeduction" },
          deliveryCharges: { $sum: "$deliveryCharge" },
          netAmount: {
            $sum: {
              $subtract: [
                { $multiply: ["$orderedItem.price", "$orderedItem.quantity"] },
                { $add: ["$itemDiscount", "$itemCouponDeduction"] }
              ]
            }
          }
        }
      },
      // Format the output
      {
        $project: {
          date: "$_id",
          ordersCount: { $size: "$ordersCount" }, // Get count of unique orders
          revenue: 1,
          discount: 1,
          couponDeduction: 1,
          netAmount: 1,
          _id: 0
        }
      },
      { $sort: { date: -1 } }
    ]);

    // Calculate totals
    const totals = salesData.reduce((acc, curr) => ({
      totalOrders: acc.totalOrders + curr.ordersCount,
      totalAmount: acc.totalAmount + curr.revenue,
      totalDiscount: acc.totalDiscount + curr.discount,
      totalCouponDeduction: acc.totalCouponDeduction + curr.couponDeduction,
      totalNetAmount: acc.totalNetAmount + curr.netAmount
    }), { 
      totalOrders: 0, 
      totalAmount: 0, 
      totalDiscount: 0,
      totalCouponDeduction: 0,
      totalNetAmount: 0
    });

    // Calculate average order value
    const averageOrderValue = totals.totalOrders > 0 
      ? (totals.totalNetAmount / totals.totalOrders).toFixed(2) 
      : 0;

    // Render the dashboard
    res.render("admin/dashboard", {
      title: "Sales Report",
      csspage: "dashboard.css",
      layout: "./layout/admin-layout.ejs",
      salesData,
      totalOrders: totals.totalOrders,
      totalAmount: totals.totalAmount.toFixed(2),
      totalDiscount: totals.totalDiscount.toFixed(2),
      totalCouponDeduction: totals.totalCouponDeduction.toFixed(2),
      totalNetAmount: totals.totalNetAmount.toFixed(2),
      averageOrderValue
    });

  } catch (error) {
   
    res.status(500).send("Error loading dashboard");
  }
};




const ledgerData = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Create the base pipeline
    const pipeline = [
      { $unwind: "$orderedItem" },
      {
        $match: {
          "orderedItem.status": {
            $nin: ["Canceled", "Returned", "Cancel Request", "Return Request", "Payment pending"]
          }
        }
      }
    ];
    
    // Add date range filter if both start and end dates are provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0); // Start of day
      
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // End of day
      
      pipeline.push({
        $match: {
          orderDate: { $gte: start, $lte: end }
        }
      });
    }
    
    pipeline.push(
      {
        $lookup: {
          from: "coupons",
          localField: "couponCode",
          foreignField: "couponCode",
          as: "coupon"
        }
      },
      { $unwind: { path: "$coupon", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          itemDiscount: {
            $cond: [
              { $and: [
                { $gt: ["$coupon.discount", 0] },
                { $gte: ["$orderedItem.price", "$coupon.minimumPurchase"] }
              ]},
              { $divide: [
                { $multiply: ["$orderedItem.price", "$orderedItem.quantity", "$coupon.discount"] },
                100
              ]},
              0
            ]
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$orderDate" },
            month: { $month: "$orderDate" }
          },
          totalSales: {
            $sum: {
              $subtract: [
                { $multiply: ["$orderedItem.price", "$orderedItem.quantity"] },
                "$itemDiscount"
              ]
            }
          },
          dateRange: {
            $first: {
              start: startDate ? new Date(startDate) : null,
              end: endDate ? new Date(endDate) : null
            }
          }
        }
      },
      {
        $sort: {
          "_id.year": -1,
          "_id.month": -1
        }
      }
    );

    const ledgerData = await Order.aggregate(pipeline);

    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    const formattedData = ledgerData.map((entry) => ({
      year: entry._id.year,
      month: months[entry._id.month - 1],
      totalSales: entry.totalSales.toFixed(2),
      period: startDate && endDate ? 
        `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}` : 
        'All Time'
    }));

    res.json(formattedData);
  } catch (error) {
    
    res.status(500).json({ message: "Failed to generate ledger data." });
  }
};








const getDateRange = (period) => {
  const now = new Date();
  const start = new Date();
  
  switch(period) {
    case 'daily':
      start.setDate(now.getDate() - 7);
      break;
    case 'weekly':
  
      const currentDay = now.getDay();
      const diff = currentDay === 0 ? 6 : currentDay - 1; // Adjust for Sunday
      now.setDate(now.getDate() - diff); // Move to current week's Monday
      start.setDate(now.getDate() - (4 * 7)); // Go back 4 weeks from current week's Monday
      break;
    case 'monthly':
      start.setMonth(now.getMonth() - 4);
      break;
    case 'yearly':
      start.setFullYear(now.getFullYear() - 4);
      break;
    default:
      start.setDate(now.getDate() - 5);
  }
  
  // Set time to start of day for start date and end of day for end date
  start.setHours(0, 0, 0, 0);
  now.setHours(23, 59, 59, 999);
  
  return { start, end: now };
};

const salesData = async (req, res) => {
  try {
    const { period = 'daily', startDate, endDate } = req.query;
    const dateRange = getDateRange(period);
    const start = startDate ? new Date(startDate) : dateRange.start;
    const end = endDate ? new Date(endDate) : dateRange.end;

    const getDateFormat = (period) => {
      switch (period) {
        case 'daily':
          return '%Y-%m-%d';
        case 'weekly':
          return '%Y-W%V'; // ISO week format
        case 'monthly':
          return '%Y-%m';
        default:
          return '%Y';
      }
    };

    const pipeline = [
      {
        $match: {
          orderDate: { $gte: start, $lte: end },
          status: { $nin: ["Canceled", "Returned", "Cancel Request", "Return Request", "Payment Pending"] }
        }
      },
      { $unwind: "$orderedItem" },
      {
        $group: {
          _id: {
            date: period === 'weekly' 
              ? {
                  $concat: [
                    { $toString: { $isoWeekYear: "$orderDate" } }, "-W",
                    { $toString: { $isoWeek: "$orderDate" } }
                  ]
                }
              : {
                  $dateToString: {
                    format: getDateFormat(period),
                    date: "$orderDate"
                  }
                }
          },
          sales: { 
            $sum: { $multiply: ["$orderedItem.price", "$orderedItem.quantity"] }
          },
          discounts: {
            $sum: { $ifNull: ["$discount", 0] }
          },
          weekStart: { $min: "$orderDate" },  // Always apply, but ignore if not used
          weekEnd: { $max: "$orderDate" }     // Always apply, but ignore if not used
        }
      },
      { $sort: { "_id.date": 1 } },
      {
        $project: {
          _id: 0,
          date: "$_id.date",
          sales: 1,
          discounts: 1,
          weekRange: {
            $cond: {
              if: { $eq: [period, "weekly"] },
              then: {
                $concat: [
                  { $dateToString: { format: "%b %d", date: "$weekStart" } },
                  " - ",
                  { $dateToString: { format: "%b %d", date: "$weekEnd" } }
                ]
              },
              else: null
            }
          }
        }
      }
      
    ];

    const results = await Order.aggregate(pipeline);

    // Format the labels based on period
    const labels = results.map(r => 
      period === 'weekly' ? (r.weekRange || r.date) : r.date
    );
    
    const sales = results.map(r => r.sales);
    const discounts = results.map(r => r.discounts);

    res.json({ labels, sales, discounts });
  } catch (error) {
  
    res.status(500).json({ error: error.message });
  }
};
const topProducts= async (req, res) => {
  try {
      const topProducts = await Order.aggregate([
          { $unwind: '$orderedItem' },
          {
              $group: {
                  _id: '$orderedItem.product',
                  totalQuantity: { $sum: '$orderedItem.quantity' }
              }
          },
          { $sort: { totalQuantity: -1 } },
          { $limit: 3 },
          {
              $lookup: {
                  from: 'products',
                  localField: '_id',
                  foreignField: '_id',
                  as: 'productDetails'
              }
          }
      ]);

      const formattedProducts = topProducts.map(product => ({
          name: product.productDetails[0]?.name || 'Unknown Product',
          percentage: (product.totalQuantity / topProducts.reduce((acc, curr) => acc + curr.totalQuantity, 0)) * 100
      }));

      res.json(formattedProducts);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
};
const topCategories= async (req, res) => {
  try {
      const topCategories = await Order.aggregate([
          { $unwind: '$orderedItem' },
          {
              $lookup: {
                  from: 'products',
                  localField: 'orderedItem.product',
                  foreignField: '_id',
                  as: 'product'
              }
          },
          { $unwind: '$product' },
          {
              $group: {
                  _id: '$product.category',
                  totalSales: { $sum: '$orderedItem.quantity' }
              }
          },
          { $sort: { totalSales: -1 } },
          { $limit: 3 },
          {
              $lookup: {
                  from: 'categories',
                  localField: '_id',
                  foreignField: '_id',
                  as: 'categoryDetails'
              }
          }
      ]);

      const formattedCategories = topCategories.map(category => ({
          name: category.categoryDetails[0]?.name || 'Unknown Category',
          percentage: (category.totalSales / topCategories.reduce((acc, curr) => acc + curr.totalSales, 0)) * 100
      }));

      res.json(formattedCategories);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
};

module.exports = { loadDashboard, ledgerData,salesData,topProducts ,topCategories};
