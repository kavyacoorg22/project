const walletModel = require('../../model/userModel/walletModel')



const loadWallet = async (req, res) => {
  try {
    const userId = req.user._id;
    const wallet = await walletModel.findOne({ user: userId })
      .populate('transactions')
      .sort({ 'transactions.date': -1 })
      .lean();

    if (!wallet) {
      return res.render('user/wallet', {
        title: "Wallet",
        includeCss: true,
        csspage: "wallet.css",
        wallet: { balance: 0, transactions: [] }
      });
    }

    res.render('user/wallet', {
      title: "Wallet",
      includeCss: true,
      csspage: "wallet.css",
      wallet
    });
  } catch (err) {
    console.error('Error loading wallet:', err);
    res.status(500).render('error', { 
      message: 'Failed to load wallet details',
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  }
};

// const addWallet = async (req, res) => {
//   try {
//     const { amount } = req.body;
//     const userId = req.user._id;

//     if (!userId || !amount || amount <= 0) {
//       return res.status(400).json({ error: "Invalid amount or user ID" });
//     }
   
//     let wallet = await walletModel.findOne({ user: userId });

//     if (!wallet) {
//       wallet = new walletModel({
//         user: userId,
//         balance: 0,
//         transactions: [],
//       });
//     }

//     wallet.balance += amount;
//     wallet.transactions.push({
//       transactionType: "deposit",
//       amount: amount,
//       date: new Date(),
//     });

//     await wallet.save();

//     return res.status(200).json({
//       status: "success", // Corrected: Added quotes around "success"
//       message: "Money added successfully",
//       balance: wallet.balance,
//       transactions: wallet.transactions,
//     });
//   } catch (err) {
//     console.error("Error adding money to wallet:", err);
//     res.status(500).json({ error: "Error adding money to wallet" });
//   }
// };



const addWallet = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user._id;

    // Validate amount is a number and within reasonable limits
    const numAmount = Number(amount);
    if (!userId || isNaN(numAmount) || numAmount <= 0 || numAmount > 100000) {
      return res.status(400).json({ 
        status: "error",
        error: "Invalid amount. Please enter an amount between 1 and 100,000" 
      });
    }

    // Use findOneAndUpdate for atomic operation
    const wallet = await walletModel.findOneAndUpdate(
      { user: userId },
      {
        $inc: { balance: numAmount },
        $push: {
          transactions: {
            transactionType: "deposit",
            amount: numAmount,
            date: new Date()
          }
        }
      },
      { 
        new: true,
        upsert: true // Creates new wallet if doesn't exist
      }
    );

    return res.status(200).json({
      status: "success",
      message: "Money added successfully",
      balance: wallet.balance,
      transactions: wallet.transactions.slice(-5) // Return only recent transactions
    });

  } catch (err) {
    console.error("Error adding money to wallet:", err);
    res.status(500).json({ 
      status: "error",
      error: "Failed to add money to wallet. Please try again." 
    });
  }
};

 module.exports={loadWallet,addWallet}