// app/api/wallet/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Adjust path as needed
import dbConnect from '@/lib/mongodb';
import Wallet from '@/models/Wallet';

// GET wallet details
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

    // Find wallet by user email or userId (depending on your User model)
    const wallet = await Wallet.findOne({ 
      email: session.user.email 
      // OR userId: session.user.id if you have userId in session
    });
        
    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      wallet: {
        id: wallet._id,
        balance: wallet.balance,
        totalDeposited: wallet.totalDeposited,
        totalWithdrawn: wallet.totalWithdrawn,
        lastTransactionDate: wallet.lastTransactionDate,
      }
    });
   
  } catch (error) {
    console.error('Wallet fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}