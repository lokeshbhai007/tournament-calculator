// app/api/auth/[...nextauth]/route.js
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import CredentialsProvider from 'next-auth/providers/credentials';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { generateToken } from '@/lib/jwt';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
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
          await User.create({
            name: user.name,
            email: user.email,
            provider: account.provider,
            providerId: account.providerAccountId,
            image: user.image,
          });
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
          token.jwtToken = generateToken({
            userId: dbUser._id.toString(),
            email: dbUser.email
          });
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId;
        session.accessToken = token.jwtToken;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
  return `${baseUrl}/dashboard`;
}

  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
  },
  debug: process.env.NODE_ENV === 'development',
});

export { handler as GET, handler as POST };