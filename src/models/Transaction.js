// models/Transaction.js
import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  walletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true,
  },
  type: {
    type: String,
    enum: ['credit', 'debit'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'completed',
  },
  balanceAfter: {
    type: Number,
    required: true,
  },
}, {
  timestamps: true,
});

// Index for faster queries
TransactionSchema.index({ userId: 1, createdAt: -1 });
TransactionSchema.index({ walletId: 1, createdAt: -1 });

export default mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);