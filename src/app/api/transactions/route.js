// app/api/transactions/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { WalletService } from '@/lib/walletService';

// GET transaction history with pagination
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    // Find user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get transaction history
    const transactions = await WalletService.getTransactionHistory(user._id, limit, skip);

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
      createdAt: transaction.createdAt,
    }));

    return NextResponse.json({
      transactions: formattedTransactions,
      pagination: {
        currentPage: page,
        limit,
        hasMore: transactions.length === limit,
      }
    });

  } catch (error) {
    console.error('Transaction history fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}