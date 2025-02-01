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

const addWallet = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user._id;

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount or user ID" });
    }

    let wallet = await walletModel.findOne({ user: userId });

    if (!wallet) {
      wallet = new walletModel({
        user: userId,
        balance: 0,
        transactions: [],
      });
    }

    wallet.balance += amount;
    wallet.transactions.push({
      transactionType: "deposit",
      amount: amount,
      date: new Date(),
    });

    await wallet.save();

    return res.status(200).json({
      status: "success", // Corrected: Added quotes around "success"
      message: "Money added successfully",
      balance: wallet.balance,
      transactions: wallet.transactions,
    });
  } catch (err) {
    console.error("Error adding money to wallet:", err);
    res.status(500).json({ error: "Error adding money to wallet" });
  }
};
module.exports={loadWallet,addWallet}