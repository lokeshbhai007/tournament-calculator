// app/api/auth/signup/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Wallet from '@/models/Wallet';
import { generateToken } from '@/lib/jwt';
import { WalletService } from '@/lib/walletService';

export async function POST(request) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Create user with isAdmin set to false by default
    const user = await User.create({
      name,
      email,
      password,
      provider: 'manual',
      username: null,
      isAdmin: false,
    });

    // Create wallet for the new user
    const wallet = await Wallet.create({
      userId: user._id,
      email: user.email,
      balance: 0, // Start with 0 balance, will be updated by transaction
      totalDeposited: 0,
      totalWithdrawn: 0,
    });

    // Create signup bonus transaction
    const bonusAmount = 200.00;
    const transactionResult = await WalletService.createSignupBonus(
      user._id,
      wallet._id,
      bonusAmount
    );

    // Generate token
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      isAdmin: user.isAdmin,
    });

    // Prepare response
    const response = NextResponse.json(
      {
        message: 'User created successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          username: user.username,
          isAdmin: user.isAdmin,
        },
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
        }
      },
      { status: 201 }
    );

    // Set auth cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;

  } catch (error) {
    console.error('Signup error:', error);

    // If it's a validation error, provide more specific feedback
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}