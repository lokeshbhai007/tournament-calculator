// app/providers.jsx
"use client";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";

export default function Providers({ children, session }) {
  return (
    <SessionProvider session={session}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 1000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </SessionProvider>
  );
}