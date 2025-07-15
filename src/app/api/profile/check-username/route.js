// app/api/profile/check-username/route.js

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route'; // Adjust path as needed
import connectDB from '@/lib/mongodb'; // Adjust path as needed
import User from '@/models/User'; // Adjust path as needed

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { username } = await request.json();

    if (!username || username.length < 3) {
      return NextResponse.json({ 
        error: 'Username must be at least 3 characters long' 
      }, { status: 400 });
    }

    // Basic username validation
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json({ 
        error: 'Username can only contain letters, numbers, and underscores (3-20 characters)' 
      }, { status: 400 });
    }

    await connectDB();

    // Get current user to check if they've already changed their username
    const currentUser = await User.findOne({ email: session.user.email });
    
    if (!currentUser) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 });
    }

    // If user has already changed their username, they can't change it again
    if (currentUser.hasChangedUsername && currentUser.username !== username.toLowerCase()) {
      return NextResponse.json({ 
        available: false,
        error: 'Username can only be changed once. You have already changed your username.',
        message: 'Username change not allowed'
      }, { status: 400 });
    }

    // Check if username exists (excluding current user)
    const existingUser = await User.findOne({ 
      username: username.toLowerCase(),
      email: { $ne: session.user.email } // Exclude current user
    });

    return NextResponse.json({ 
      available: !existingUser,
      message: existingUser ? 'Username is already taken' : 'Username is available'
    });

  } catch (error) {
    console.error('Error checking username:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// For Pages API (if using pages/api instead of app/api)
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { username } = req.body;

    if (!username || username.length < 3) {
      return res.status(400).json({ 
        error: 'Username must be at least 3 characters long' 
      });
    }

    // Basic username validation
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ 
        error: 'Username can only contain letters, numbers, and underscores (3-20 characters)' 
      });
    }

    await connectDB();

    // Get current user to check if they've already changed their username
    const currentUser = await User.findOne({ email: session.user.email });
    
    if (!currentUser) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    // If user has already changed their username, they can't change it again
    if (currentUser.hasChangedUsername && currentUser.username !== username.toLowerCase()) {
      return res.status(400).json({ 
        available: false,
        error: 'Username can only be changed once. You have already changed your username.',
        message: 'Username change not allowed'
      });
    }

    // Check if username exists (excluding current user)
    const existingUser = await User.findOne({ 
      username: username.toLowerCase(),
      email: { $ne: session.user.email } // Exclude current user
    });

    return res.json({ 
      available: !existingUser,
      message: existingUser ? 'Username is already taken' : 'Username is available'
    });

  } catch (error) {
    console.error('Error checking username:', error);
    return res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}