// app/api/admin/users/[userId]/wallet/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Wallet from '@/models/Wallet';
import { WalletService } from '@/lib/walletService';

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || !session.user.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const { userId } = params;
    const { amount, type, title, description } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      );
    }

    if (!type || !['add', 'withdraw'].includes(type)) {
      return NextResponse.json(
        { error: 'Transaction type must be "add" or "withdraw"' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find or create wallet
    let wallet = await Wallet.findOne({ userId: userId });
    
    if (!wallet) {
      // Create new wallet if it doesn't exist
      wallet = new Wallet({
        userId: userId,
        email: user.email,
        balance: 0,
        totalDeposited: 0,
        totalWithdrawn: 0,
      });
      await wallet.save();
    }

    // Convert transaction type to credit/debit for consistency
    const transactionType = type === 'add' ? 'credit' : 'debit';
    
    // Set default title and description if not provided
    const transactionTitle = title || `Admin ${type === 'add' ? 'Credit' : 'Debit'}`;
    const transactionDescription = description || `Admin ${type === 'add' ? 'added' : 'withdrew'} ₹${amount} ${type === 'add' ? 'to' : 'from'} wallet`;

    // Process transaction using WalletService for consistency
    const transactionResult = await WalletService.processTransaction({
      userId: userId,
      walletId: wallet._id,
      type: transactionType,
      amount: parseFloat(amount),
      title: transactionTitle,
      description: transactionDescription,
    });

    return NextResponse.json({
      message: `Successfully ${type === 'add' ? 'added' : 'withdrawn'} ₹${amount}`,
      wallet: {
        id: transactionResult.wallet._id,
        balance: transactionResult.wallet.balance,
        totalDeposited: transactionResult.wallet.totalDeposited,
        totalWithdrawn: transactionResult.wallet.totalWithdrawn,
        lastTransactionDate: transactionResult.wallet.lastTransactionDate,
      },
      transaction: {
        id: transactionResult.transaction._id,
        title: transactionResult.transaction.title,
        amount: transactionResult.transaction.amount,
        type: transactionResult.transaction.type,
        date: transactionResult.transaction.createdAt.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        description: transactionResult.transaction.description,
        status: transactionResult.transaction.status,
        balanceAfter: transactionResult.transaction.balanceAfter,
      }
    });

  } catch (error) {
    console.error('Error processing wallet transaction:', error);
    
    if (error.message === 'Insufficient balance') {
      return NextResponse.json(
        { error: 'Insufficient wallet balance' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get wallet details for admin
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || !session.user.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const { userId } = params;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find wallet
    const wallet = await Wallet.findOne({ userId: userId });
    
    if (!wallet) {
      return NextResponse.json({
        wallet: {
          id: null,
          balance: 0,
          totalDeposited: 0,
          totalWithdrawn: 0,
          lastTransactionDate: null,
        },
        transactions: [],
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        }
      });
    }

    // Get recent transaction history (last 10 transactions)
    const transactions = await WalletService.getTransactionHistory(userId, 10, 0);

    // Format transactions for frontend
    const formattedTransactions = transactions.map(transaction => ({
      id: transaction._id,
      title: transaction.title,
      amount: transaction.amount,
      type: transaction.type,
      date: transaction.createdAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      description: transaction.description,
      status: transaction.status,
      balanceAfter: transaction.balanceAfter,
    }));

    return NextResponse.json({
      wallet: {
        id: wallet._id,
        balance: wallet.balance,
        totalDeposited: wallet.totalDeposited,
        totalWithdrawn: wallet.totalWithdrawn,
        lastTransactionDate: wallet.lastTransactionDate,
      },
      transactions: formattedTransactions,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      }
    });

  } catch (error) {
    console.error('Error fetching wallet details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}