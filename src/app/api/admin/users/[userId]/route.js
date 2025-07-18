// app/api/admin/users/[userId]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Wallet from '@/models/Wallet';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || !session.user.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const { userId } = await params;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Fetch user details
    const user = await User.findById(userId).select('name email username isAdmin createdAt updatedAt');
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Fetch wallet information
    const wallet = await Wallet.findOne({ userId: userId });

    const userWithWallet = {
      ...user.toObject(),
      walletBalance: wallet ? wallet.balance : 0,
      walletId: wallet ? wallet._id : null,
      totalDeposited: wallet ? wallet.totalDeposited : 0,
      totalWithdrawn: wallet ? wallet.totalWithdrawn : 0,
      lastTransactionDate: wallet ? wallet.lastTransactionDate : null,
    };

    return NextResponse.json({
      user: userWithWallet
    });

  } catch (error) {
    console.error('Error fetching user details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

