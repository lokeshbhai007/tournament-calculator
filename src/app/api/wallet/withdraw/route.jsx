// app/api/wallet/withdraw/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Wallet from '@/models/Wallet';

export async function POST(request) {
  try {
    // Get session using NextAuth
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { amount } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    await dbConnect();

    // First, find the wallet to check balance
    const wallet = await Wallet.findOne({ email: session.user.email });

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      );
    }

    if (wallet.balance < amount) {
      return NextResponse.json(
        { error: 'Insufficient balance' },
        { status: 400 }
      );
    }

    // Update the wallet
    const updatedWallet = await Wallet.findOneAndUpdate(
      { email: session.user.email },
      {
        $inc: {
          balance: -amount,
          totalWithdrawn: amount
        },
        lastTransactionDate: new Date()
      },
      { new: true }
    );

    return NextResponse.json({
      message: 'Withdrawal successful',
      wallet: {
        balance: updatedWallet.balance,
        totalDeposited: updatedWallet.totalDeposited,
        totalWithdrawn: updatedWallet.totalWithdrawn,
      }
    });
   
  } catch (error) {
    console.error('Withdrawal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}