// app/api/admin/users/[userId]/wallet/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Wallet from '@/models/Wallet';

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
    const { amount, type } = await request.json();

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

    await connectDB();

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
    }

    // Process transaction
    if (type === 'add') {
      wallet.balance += amount;
      wallet.totalDeposited += amount;
    } else if (type === 'withdraw') {
      if (wallet.balance < amount) {
        return NextResponse.json(
          { error: 'Insufficient wallet balance' },
          { status: 400 }
        );
      }
      wallet.balance -= amount;
      wallet.totalWithdrawn += amount;
    }

    wallet.lastTransactionDate = new Date();
    await wallet.save();

    return NextResponse.json({
      message: `Successfully ${type === 'add' ? 'added' : 'withdrawn'} ₹${amount}`,
      wallet: {
        balance: wallet.balance,
        totalDeposited: wallet.totalDeposited,
        totalWithdrawn: wallet.totalWithdrawn,
        lastTransactionDate: wallet.lastTransactionDate,
      }
    });

  } catch (error) {
    console.error('Error processing wallet transaction:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}