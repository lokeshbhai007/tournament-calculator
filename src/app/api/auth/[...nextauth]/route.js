// app/api/auth/[...nextauth]/route.js
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Wallet from '@/models/Wallet';
import { generateToken } from '@/lib/jwt';
import { WalletService } from '@/lib/walletService';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        await dbConnect();

        try {
          const user = await User.findOne({ email: credentials.email });
                    
          if (!user) {
            throw new Error('No user found with this email');
          }

          // Use your existing comparePassword method
          const isValidPassword = await user.comparePassword(credentials.password);
                    
          if (!isValidPassword) {
            throw new Error('Invalid password');
          }

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            image: user.image,
            isAdmin: user.isAdmin || false,
          };
        } catch (error) {
          console.error('Authorization error:', error);
          throw new Error(error.message || 'Authentication failed');
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      await dbConnect();
            
      try {
        const existingUser = await User.findOne({ email: user.email });
                
        // Only create user for social providers (not credentials)
        if (!existingUser && account?.provider !== 'credentials') {
          const newUser = await User.create({
            name: user.name,
            email: user.email,
            provider: account.provider,
            providerId: account.providerAccountId,
            image: user.image,
            isAdmin: false,
          });

          // Create wallet for new social user
          const wallet = await Wallet.create({
            userId: newUser._id,
            email: newUser.email,
            balance: 0, // Start with 0, will be updated by transaction
            totalDeposited: 0,
            totalWithdrawn: 0,
          });

          // Create signup bonus transaction for social login
          await WalletService.createSignupBonus(newUser._id, wallet._id, 3.00);
        }
                
        return true;
      } catch (error) {
        console.error('Error during sign in:', error);
        return false;
      }
    },
    async jwt({ token, user, account }) {
      if (user) {
        await dbConnect();
        const dbUser = await User.findOne({ email: user.email });
        if (dbUser) {
          token.userId = dbUser._id.toString();
          token.isAdmin = dbUser.isAdmin || false;
          token.jwtToken = generateToken({
            userId: dbUser._id.toString(),
            email: dbUser.email,
            isAdmin: dbUser.isAdmin || false,
          });
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId;
        session.user.isAdmin = token.isAdmin || false;
        session.accessToken = token.jwtToken;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      console.log('Redirect callback:', { url, baseUrl });
            
      // Handle logout redirect
      if (url.includes('/api/auth/signout')) {
        return baseUrl;
      }
            
      // Handle callback URLs
      if (url.startsWith(baseUrl)) {
        return url;
      }
            
      // Default to home page
      return baseUrl;
    }
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
  },
  events: {
    async signOut({ token }) {
      console.log('User signed out:', token);
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };