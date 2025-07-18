// src/middleware.js
import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    console.log("Middleware - Path:", pathname);
    console.log("Middleware - Token exists:", !!req.nextauth.token);
    console.log("Middleware - User:", req.nextauth.token?.email || "No user");
    console.log("Middleware - Is Admin:", req.nextauth.token?.isAdmin || false);

    // Check if user is trying to access admin route
    if (pathname.startsWith('/admin')) {
      const isAdmin = req.nextauth.token?.isAdmin || false;
      if (!isAdmin) {
        console.log("Non-admin user trying to access admin route - redirecting");
        return Response.redirect(new URL('/', req.url));
      }
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
                
        console.log("Authorization check for:", pathname);
        console.log("Token exists:", !!token);
                
        // Define public routes
        const publicRoutes = [
          '/',
          '/terms',
          '/announcements',
          '/auth/signin',
          '/auth/signup',
        ];
                
        // Allow public routes
        if (publicRoutes.includes(pathname)) {
          console.log("Public route - allowing access");
          return true;
        }

        // For admin routes, check if user is admin
        if (pathname.startsWith('/admin')) {
          const isAdmin = token?.isAdmin || false;
          console.log("Admin route - user is admin:", isAdmin);
          return !!token && isAdmin;
        }
                
        // For other protected routes, require token
        const isAuthorized = !!token;
        console.log("Protected route - authorized:", isAuthorized);
                
        return isAuthorized;
      },
    },
    pages: {
      signIn: '/auth/signin',
    },
  }
);

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg).*)',
  ]
};