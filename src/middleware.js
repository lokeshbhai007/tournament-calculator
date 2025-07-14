// src/middleware.js - Simple Alternative
import { withAuth } from "next-auth/middleware";

export default withAuth(
  // This function only runs if user is authenticated
  function middleware(req) {
    console.log("Authenticated user accessing:", req.nextUrl.pathname);
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Define public routes
        const publicRoutes = [
          '/',
          '/terms',
          '/announcements',
          '/auth/signin',
          '/auth/signup'
        ];
        
        // Allow public routes without authentication
        if (publicRoutes.includes(pathname)) {
          return true;
        }
        
        // For all other routes, require authentication
        // If not authenticated, NextAuth will redirect to signIn page
        return !!token;
      },
    },
    pages: {
      signIn: '/auth/signin', // Your custom sign-in page
    },
  }
);

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ]
};