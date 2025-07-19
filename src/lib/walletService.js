// lib/walletService.js
import Wallet from '@/models/Wallet';
import Transaction from '@/models/Transaction';

export class WalletService {
  /**
   * Create a transaction record
   * @param {Object} transactionData - Transaction data
   * @returns {Promise<Transaction>} - Created transaction
   */
  static async createTransaction(transactionData) {
    const {
      userId,
      walletId,
      type,
      amount,
      title,
      description = '',
      status = 'completed'
    } = transactionData;

    // Get current wallet balance
    const wallet = await Wallet.findById(walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Calculate balance after transaction
    const balanceAfter = type === 'credit' 
      ? wallet.balance + amount 
      : wallet.balance - amount;

    // Create transaction record
    const transaction = await Transaction.create({
      userId,
      walletId,
      type,
      amount,
      title,
      description,
      status,
      balanceAfter,
    });

    return transaction;
  }

  /**
   * Process a wallet transaction (credit/debit)
   * @param {Object} transactionData - Transaction data
   * @returns {Promise<Object>} - Updated wallet and transaction
   */
  static async processTransaction(transactionData) {
    const {
      userId,
      walletId,
      type,
      amount,
      title,
      description = ''
    } = transactionData;

    // Find wallet
    const wallet = await Wallet.findById(walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Validate transaction
    if (type === 'debit' && wallet.balance < amount) {
      throw new Error('Insufficient balance');
    }

    // Create transaction record first
    const transaction = await this.createTransaction({
      userId,
      walletId,
      type,
      amount,
      title,
      description,
      status: 'completed'
    });

    // Update wallet balance and totals
    const updateData = {
      balance: type === 'credit' 
        ? wallet.balance + amount 
        : wallet.balance - amount,
      lastTransactionDate: new Date(),
    };

    if (type === 'credit') {
      updateData.totalDeposited = wallet.totalDeposited + amount;
    } else {
      updateData.totalWithdrawn = wallet.totalWithdrawn + amount;
    }

    const updatedWallet = await Wallet.findByIdAndUpdate(
      walletId,
      updateData,
      { new: true }
    );

    return {
      wallet: updatedWallet,
      transaction
    };
  }

  /**
   * Get transaction history for a user
   * @param {String} userId - User ID
   * @param {Number} limit - Number of transactions to return
   * @param {Number} skip - Number of transactions to skip
   * @returns {Promise<Array>} - Array of transactions
   */
  static async getTransactionHistory(userId, limit = 10, skip = 0) {
    const transactions = await Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate('walletId', 'balance');

    return transactions;
  }

  /**
   * Create signup bonus transaction
   * @param {String} userId - User ID
   * @param {String} walletId - Wallet ID
   * @param {Number} amount - Bonus amount
   * @returns {Promise<Object>} - Transaction result
   */
  static async createSignupBonus(userId, walletId, amount = 200) {
    return await this.processTransaction({
      userId,
      walletId,
      type: 'credit',
      amount,
      title: 'Sign Up Bonus',
      description: 'Welcome bonus for new user registration'
    });
  }
}