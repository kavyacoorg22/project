const mongoose = require("mongoose");


const walletSchema = new mongoose.Schema(
  {
    user: {
      type:  mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
    },
    transactions: [
      {
        transactionType: {
          type: String,
          enum: ["deposit", "withdrawal"],
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
        date: {
          type: Date,
          default: Date.now,
        },
      }
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("wallet", walletSchema);