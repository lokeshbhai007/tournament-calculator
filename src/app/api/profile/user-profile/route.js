// app/api/profile/user-profile/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route'; // Adjust path as needed
import connectDB from '@/lib/mongodb'; // Adjust path as needed
import User from '@/models/User'; // Adjust path as needed

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get user profile data
    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      name: user.name,
      username: user.username,
      email: user.email,
      hasChangedUsername: user.hasChangedUsername,
      usernameChangedAt: user.usernameChangedAt
    });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// For Pages API (if using pages/api instead of app/api)
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await connectDB();

    // Get user profile data
    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      name: user.name,
      username: user.username,
      email: user.email,
      hasChangedUsername: user.hasChangedUsername,
      usernameChangedAt: user.usernameChangedAt
    });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    return res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}