// app/api/wallet/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Wallet from '@/models/Wallet';
import User from '@/models/User';
import { WalletService } from '@/lib/walletService';

// GET wallet details with transaction history
export async function GET(request) {
  try {
    // Get session using NextAuth
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    // Find user first to get userId
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find wallet by user email
    const wallet = await Wallet.findOne({ email: session.user.email });
    
    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      );
    }

    // Get transaction history
    const transactions = await WalletService.getTransactionHistory(user._id, 20, 0);

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
    });

  } catch (error) {
    console.error('Wallet fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Add money to wallet or create transaction
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { amount, type, title, description } = await request.json();

    if (!amount || !type || !title) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find wallet
    const wallet = await Wallet.findOne({ email: session.user.email });
    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      );
    }

    // Process transaction
    const transactionResult = await WalletService.processTransaction({
      userId: user._id,
      walletId: wallet._id,
      type,
      amount: parseFloat(amount),
      title,
      description: description || '',
    });

    return NextResponse.json({
      message: 'Transaction completed successfully',
      wallet: {
        id: transactionResult.wallet._id,
        balance: transactionResult.wallet.balance,
        totalDeposited: transactionResult.wallet.totalDeposited,
        totalWithdrawn: transactionResult.wallet.totalWithdrawn,
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
      }
    });

  } catch (error) {
    console.error('Transaction error:', error);
    
    if (error.message === 'Insufficient balance') {
      return NextResponse.json(
        { error: 'Insufficient balance' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}