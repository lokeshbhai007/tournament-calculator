// models/Wallet.js
import mongoose from 'mongoose';

const WalletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true, // this already creates an index
  },
  email: {
    type: String,
    required: true,
  },
  balance: {
    type: Number,
    default: 2000.00,
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

// Remove this line ↓
// WalletSchema.index({ userId: 1 });
WalletSchema.index({ email: 1 }); // you can keep this

export default mongoose.models.Wallet || mongoose.model('Wallet', WalletSchema);
