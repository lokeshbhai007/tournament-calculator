// app/api/admin/users/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Wallet from '@/models/Wallet';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || !session.user.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    await connectDB();

    // Fetch all users with their wallet information
    const users = await User.find({})
      .select('name email username isAdmin createdAt updatedAt')
      .sort({ createdAt: -1 });

    // Fetch wallet information for each user
    const usersWithWallets = await Promise.all(
      users.map(async (user) => {
        const wallet = await Wallet.findOne({ userId: user._id });
        return {
          ...user.toObject(),
          walletBalance: wallet ? wallet.balance : 0,
          walletId: wallet ? wallet._id : null,
        };
      })
    );

    return NextResponse.json({
      users: usersWithWallets,
      totalUsers: usersWithWallets.length
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}