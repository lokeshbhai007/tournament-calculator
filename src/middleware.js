// src/middleware.js
import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    // Add any additional middleware logic here if needed
    console.log("Middleware running for:", req.nextUrl.pathname);
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Public routes that don't require authentication
        const publicRoutes = [
          '/',
          '/terms',
          '/announcements'
        ];
        
        // Protected routes that require authentication
        const protectedRoutes = [
          '/ranger-modal',
          '/wallet',
          '/support',
          '/profile'
        ];
        
        // Allow access to public routes without authentication
        if (publicRoutes.includes(pathname)) {
          return true;
        }
        
        // For protected routes, require authentication
        if (protectedRoutes.includes(pathname)) {
          return !!token;
        }
        
        // For all other routes, require authentication by default
        return !!token;
      },
    },
  }
);

// Only run middleware on these paths
export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ]
};