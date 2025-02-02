// const Order = require('../../model/userModel/orderModel');
// const ExcelJS = require('exceljs');
// const PDFDocument = require('pdfkit');

// // Function to generate sales report based on date range
// const loadDashboard= async (req, res) => {
//     try {
//         let startDate, endDate;
//         const { timeRange, startCustomDate, endCustomDate } = req.query;

//         // Set date range based on selected time range
//         switch (timeRange) {
//             case 'daily':
//                 startDate = new Date();
//                 startDate.setHours(0, 0, 0, 0);
//                 endDate = new Date();
//                 endDate.setHours(23, 59, 59, 999);
//                 break;
//             case 'weekly':
//                 endDate = new Date();
//                 startDate = new Date();
//                 startDate.setDate(startDate.getDate() - 7);
//                 break;
//             case 'monthly':
//                 endDate = new Date();
//                 startDate = new Date();
//                 startDate.setMonth(startDate.getMonth() - 1);
//                 break;
//             case 'yearly':
//                 endDate = new Date();
//                 startDate = new Date();
//                 startDate.setFullYear(startDate.getFullYear() - 1);
//                 break;
//             case 'custom':
//                 startDate = new Date(startCustomDate);
//                 startDate.setHours(0, 0, 0, 0);
//                 endDate = new Date(endCustomDate);
//                 endDate.setHours(23, 59, 59, 999);
//                 break;
//             default:
//                 return res.status(400).json({ error: 'Invalid time range' });
//         }

//         // Fetch sales data
//         const sales = await Order.aggregate([
//             {
//                 $match: {
//                     orderDate: { $gte: startDate, $lte: endDate },
//                     status: { $nin: ['cancelled', 'returned'] }
//                 }
//             },
//             {
//                 $group: {
//                     _id: { $dateToString: { format: "%Y-%m-%d", date: "$orderDate" } },
//                     totalOrders: { $sum: 1 },
//                     totalAmount: { $sum: "$totalAmount" },
//                     totalDiscount: { $sum: "$discount" }
//                 }
//             },
//             { $sort: { _id: 1 } }
//         ]);

//         // Calculate overall totals
//         const overallTotals = sales.reduce((acc, day) => {
//             acc.totalOrders += day.totalOrders;
//             acc.totalAmount += day.totalAmount;
//             acc.totalDiscount += day.totalDiscount;
//             return acc;
//         }, { totalOrders: 0, totalAmount: 0, totalDiscount: 0 });

//         res.render('admin/sales-report', {
//             sales,
//             overallTotals,
//             startDate: startDate.toISOString().split('T')[0],
//             endDate: endDate.toISOString().split('T')[0],
//             timeRange
//         });

//     } catch (error) {
//         console.error('Sales report error:', error);
//         res.status(500).send('Error generating sales report');
//     }
// };

// // Function to download Excel report
// const downloadExcel = async (req, res) => {
//     try {
//         const { startDate, endDate } = req.query;
        
//         const sales = await Order.find({
//             orderDate: {
//                 $gte: new Date(startDate),
//                 $lte: new Date(endDate)
//             },
//             status: { $nin: ['cancelled', 'returned'] }
//         }).sort({ orderDate: 1 });

//         const workbook = new ExcelJS.Workbook();
//         const worksheet = workbook.addWorksheet('Sales Report');

//         // Set up columns
//         worksheet.columns = [
//             { header: 'Date', key: 'date', width: 15 },
//             { header: 'Order ID', key: 'orderId', width: 15 },
//             { header: 'Amount (₹)', key: 'amount', width: 15 },
//             { header: 'Discount (₹)', key: 'discount', width: 15 },
//             { header: 'Net Amount (₹)', key: 'netAmount', width: 15 },
//             { header: 'Payment Method', key: 'paymentMethod', width: 15 }
//         ];

//         // Style header row
//         worksheet.getRow(1).font = { bold: true };
//         worksheet.getRow(1).fill = {
//             type: 'pattern',
//             pattern: 'solid',
//             fgColor: { argb: 'FFCCCCCC' }
//         };

//         // Add data rows
//         sales.forEach(order => {
//             worksheet.addRow({
//                 date: order.orderDate.toISOString().split('T')[0],
//                 orderId: order.orderID,
//                 amount: order.totalAmount,
//                 discount: order.discount,
//                 netAmount: order.totalAmount - order.discount,
//                 paymentMethod: order.paymentMethod
//             });
//         });

//         // Add totals row
//         const totalRow = worksheet.addRow({
//             date: 'TOTAL',
//             amount: sales.reduce((sum, order) => sum + order.totalAmount, 0),
//             discount: sales.reduce((sum, order) => sum + order.discount, 0),
//             netAmount: sales.reduce((sum, order) => sum + (order.totalAmount - order.discount), 0)
//         });
//         totalRow.font = { bold: true };

//         res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//         res.setHeader('Content-Disposition', `attachment; filename=sales-report-${startDate}-to-${endDate}.xlsx`);

//         await workbook.xlsx.write(res);

//     } catch (error) {
//         console.error('Excel download error:', error);
//         res.status(500).send('Error downloading Excel report');
//     }
// };

// // Function to download PDF report
// const downloadPdf = async (req, res) => {
//     try {
//         const { startDate, endDate } = req.query;

//         const sales = await Order.find({
//             orderDate: {
//                 $gte: new Date(startDate),
//                 $lte: new Date(endDate)
//             },
//             status: { $nin: ['cancelled', 'returned'] }
//         }).sort({ orderDate: 1 });

//         const doc = new PDFDocument();
//         res.setHeader('Content-Type', 'application/pdf');
//         res.setHeader('Content-Disposition', `attachment; filename=sales-report-${startDate}-to-${endDate}.pdf`);

//         doc.pipe(res);

//         // Add title and date range
//         doc.fontSize(16).text('Sales Report', { align: 'center' });
//         doc.moveDown();
//         doc.fontSize(12).text(`Period: ${startDate} to ${endDate}`, { align: 'center' });
//         doc.moveDown();

//         // Add summary
//         const totals = sales.reduce((acc, order) => ({
//             totalAmount: acc.totalAmount + order.totalAmount,
//             totalDiscount: acc.totalDiscount + order.discount
//         }), { totalAmount: 0, totalDiscount: 0 });

//         doc.fontSize(12).text('Summary:', { underline: true });
//         doc.text(`Total Orders: ${sales.length}`);
//         doc.text(`Total Amount: ₹${totals.totalAmount.toFixed(2)}`);
//         doc.text(`Total Discounts: ₹${totals.totalDiscount.toFixed(2)}`);
//         doc.text(`Net Amount: ₹${(totals.totalAmount - totals.totalDiscount).toFixed(2)}`);
//         doc.moveDown();

//         // Add orders table
//         doc.fontSize(12).text('Order Details:', { underline: true });
//         doc.moveDown();

//         const tableTop = doc.y;
//         const colWidths = [80, 120, 120, 120];

//         // Draw table headers
//         doc.text('Date', doc.x, tableTop);
//         doc.text('Amount', doc.x + colWidths[0], tableTop);
//         doc.text('Discount', doc.x + colWidths[0] + colWidths[1], tableTop);
//         doc.text('Net Amount', doc.x + colWidths[0] + colWidths[1] + colWidths[2], tableTop);

//         let yPos = tableTop + 20;

//         // Draw table rows
//         sales.forEach(order => {
//             if (yPos > 700) {  // Check if near page end
//                 doc.addPage();
//                 yPos = 50;
//             }

//             doc.text(order.orderDate.toISOString().split('T')[0], doc.x, yPos);
//             doc.text(`₹${order.totalAmount.toFixed(2)}`, doc.x + colWidths[0], yPos);
//             doc.text(`₹${order.discount.toFixed(2)}`, doc.x + colWidths[0] + colWidths[1], yPos);
//             doc.text(`₹${(order.totalAmount - order.discount).toFixed(2)}`, doc.x + colWidths[0] + colWidths[1] + colWidths[2], yPos);

//             yPos += 20;
//         });

//         doc.end();

//     } catch (error) {
//         console.error('PDF download error:', error);
//         res.status(500).send('Error downloading PDF report');
//     }
// };

// module.exports = {
//     loadDashboard,
//     downloadExcel,
//     downloadPdf
// };