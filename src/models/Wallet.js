// models/Wallet.js
import mongoose from 'mongoose';

const WalletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true, // One wallet per user
  },
  email: {
    type: String,
    required: true,
  },
  balance: {
    type: Number,
    default: 2000.00, // Initial balance of 2000 rupees
    min: 0,
  },
  totalDeposited: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalWithdrawn: {
    type: Number,
    default: 0,
    min: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastTransactionDate: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Add index for better query performance
WalletSchema.index({ userId: 1 });
WalletSchema.index({ email: 1 });

export default mongoose.models.Wallet || mongoose.model('Wallet', WalletSchema);