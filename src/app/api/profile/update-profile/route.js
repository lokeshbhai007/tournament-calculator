// app/api/profile/update-profile/route.js

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../api/auth/[...nextauth]/route';// Adjust path as needed
import connectDB from '@/lib/mongodb'; // Adjust path as needed
import User from '@/models/User'; // Adjust path as needed

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, username } = await request.json();

    // Validation
    if (!name || name.trim().length < 2) {
      return NextResponse.json({ 
        error: 'Name must be at least 2 characters long' 
      }, { status: 400 });
    }

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

    // Get current user
    const currentUser = await User.findOne({ email: session.user.email });

    if (!currentUser) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 });
    }

    // Check if user is trying to change username
    const isUsernameChange = currentUser.username !== username.toLowerCase();

    // If user is trying to change username, check if they've already changed it
    if (isUsernameChange && currentUser.hasChangedUsername) {
      return NextResponse.json({ 
        error: 'Username can only be changed once. You have already changed your username.' 
      }, { status: 400 });
    }

    // Check if username is already taken by another user
    if (isUsernameChange) {
      const existingUser = await User.findOne({ 
        username: username.toLowerCase(),
        email: { $ne: session.user.email } // Exclude current user
      });

      if (existingUser) {
        return NextResponse.json({ 
          error: 'Username is already taken' 
        }, { status: 400 });
      }
    }

    // Prepare update data
    const updateData = {
      name: name.trim(),
      username: username.toLowerCase()
    };

    // If this is a username change, mark it as changed
    if (isUsernameChange) {
      updateData.hasChangedUsername = true;
      updateData.usernameChangedAt = new Date();
    }

    // Update user profile
    const updatedUser = await User.findOneAndUpdate(
      { email: session.user.email },
      updateData,
      { 
        new: true, 
        runValidators: true 
      }
    );

    return NextResponse.json({ 
      message: 'Profile updated successfully',
      user: {
        name: updatedUser.name,
        username: updatedUser.username,
        email: updatedUser.email,
        hasChangedUsername: updatedUser.hasChangedUsername,
        usernameChangedAt: updatedUser.usernameChangedAt
      }
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    
    if (error.name === 'ValidationError') {
      return NextResponse.json({ 
        error: 'Validation error: ' + error.message 
      }, { status: 400 });
    }

    if (error.code === 11000) {
      return NextResponse.json({ 
        error: 'Username is already taken' 
      }, { status: 400 });
    }

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

    const { name, username } = req.body;

    // Validation
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ 
        error: 'Name must be at least 2 characters long' 
      });
    }

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

    // Get current user
    const currentUser = await User.findOne({ email: session.user.email });

    if (!currentUser) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    // Check if user is trying to change username
    const isUsernameChange = currentUser.username !== username.toLowerCase();

    // If user is trying to change username, check if they've already changed it
    if (isUsernameChange && currentUser.hasChangedUsername) {
      return res.status(400).json({ 
        error: 'Username can only be changed once. You have already changed your username.' 
      });
    }

    // Check if username is already taken by another user
    if (isUsernameChange) {
      const existingUser = await User.findOne({ 
        username: username.toLowerCase(),
        email: { $ne: session.user.email } // Exclude current user
      });

      if (existingUser) {
        return res.status(400).json({ 
          error: 'Username is already taken' 
        });
      }
    }

    // Prepare update data
    const updateData = {
      name: name.trim(),
      username: username.toLowerCase()
    };

    // If this is a username change, mark it as changed
    if (isUsernameChange) {
      updateData.hasChangedUsername = true;
      updateData.usernameChangedAt = new Date();
    }

    // Update user profile
    const updatedUser = await User.findOneAndUpdate(
      { email: session.user.email },
      updateData,
      { 
        new: true, 
        runValidators: true 
      }
    );

    return res.json({ 
      message: 'Profile updated successfully',
      user: {
        name: updatedUser.name,
        username: updatedUser.username,
        email: updatedUser.email,
        hasChangedUsername: updatedUser.hasChangedUsername,
        usernameChangedAt: updatedUser.usernameChangedAt
      }
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation error: ' + error.message 
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({ 
        error: 'Username is already taken' 
      });
    }

    return res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}