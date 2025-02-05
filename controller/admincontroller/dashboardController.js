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
          status: { $nin: ["Canceled", "Returned", "Cancel Request", "Return Request"] }
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
    console.error("Error loading dashboard:", error);
    res.status(500).send("Error loading dashboard");
  }
};

const ledgerData = async (req, res) => {
  try {
    const pipeline = [
      { $unwind: "$orderedItem" },
      {
        $match: {
          "orderedItem.status": {
            $nin: ["Canceled", "Returned", "Cancel Request", "Return Request"]
          }
        }
      },
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
                { $add: ["$itemDiscount", "$itemCouponDeduction"] }
              ]
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
    ];

    const ledgerData = await Order.aggregate(pipeline);

    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    const formattedData = ledgerData.map((entry) => ({
      year: entry._id.year,
      month: months[entry._id.month - 1],
      totalSales: entry.totalSales.toFixed(2)
    }));

    res.json(formattedData);
  } catch (error) {
    console.error("Error generating ledger data:", error);
    res.status(500).json({ message: "Failed to generate ledger data." });
  }
};


module.exports = { loadDashboard, ledgerData };
