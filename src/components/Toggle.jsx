// components/Toggle.jsx
'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Sun, Moon, LogOut, LogIn, User } from 'lucide-react';

export default function Toggle() {
  const [isDark, setIsDark] = useState(true); // Default to dark
  const [isHydrated, setIsHydrated] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Check if there's a saved theme preference
    const savedTheme = localStorage.getItem('theme');
    let shouldBeDark = true; // Default to dark
    
    if (savedTheme) {
      shouldBeDark = savedTheme === 'dark';
    }
    
    setIsDark(shouldBeDark);
    updateTheme(shouldBeDark);
    setIsHydrated(true);
  }, []);

  const updateTheme = (darkMode) => {
    const html = document.documentElement;
    if (darkMode) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    
    // Also save to localStorage immediately
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  };

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    updateTheme(newTheme);
  };

  const handleLogout = async () => {
    try {
      // Call your custom logout API first to clear cookies
      await fetch('/api/auth/logout', { method: 'POST' });
      
      // Then use NextAuth's signOut to handle the session and redirect
      await signOut({ 
        callbackUrl: '/',
        redirect: true
      });
      
      // Toast will show after redirect, so we don't need it here
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed');
    }
  };

  // Use your custom sign-in page
  const handleSignIn = () => {
    router.push('/auth/signin');
  };

  // Don't render until hydrated to prevent hydration mismatch
  if (!isHydrated) {
    return (
      <div className="fixed top-4 right-4 z-50 flex items-center space-x-2">
        <button
          className="theme-toggle p-2 rounded-lg border transition-all duration-200 hover:scale-105"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-primary)',
            color: 'var(--text-primary)'
          }}
          aria-label="Toggle theme"
        >
          <Sun className="w-5 h-5" />
        </button>
        <div 
          className="w-10 h-10 rounded-lg animate-pulse"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        ></div>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center space-x-2">
      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="theme-toggle p-1.5 rounded-lg border transition-all duration-200 hover:scale-105 cursor-pointer"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-primary)',
          color: 'var(--text-primary)'
        }}
        aria-label="Toggle theme"
      >
        {isDark ? (
          <Sun className="w-5 h-5" />
        ) : (
          <Moon className="w-5 h-5" />
        )}
      </button>

      {/* Auth Button */}
      {status === 'loading' ? (
        <div 
          className="w-10 h-10 rounded-lg animate-pulse"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        ></div>
      ) : session ? (
        <div className="flex items-center space-x-2">
          {/* User Info */}
          <div 
            className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg border"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-primary)'
            }}
          >
            <User 
              className="h-4 w-4" 
              style={{ color: 'var(--text-secondary)' }}
            />
            <span 
              className="text-sm"
              style={{ color: 'var(--text-primary)' }}
            >
              {session.user?.name || session.user?.email || 'User'}
            </span>
          </div>
          
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg border transition-all duration-200 hover:scale-105 group hover:opacity-90"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              color: '#ef4444'
            }}
            aria-label="Logout"
            title="Logout"
          >
            <LogOut className="h-5 w-5 group-hover:opacity-80" />
          </button>
        </div>
      ) : (
        <button
          onClick={handleSignIn}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border transition-all duration-200 hover:scale-105 group hover:opacity-90"
          style={{
            backgroundColor: 'var(--purple-primary)',
            borderColor: 'var(--purple-primary)',
            color: 'var(--text-primary)'
          }}
          aria-label="Sign in"
        >
          <LogIn className="h-5 w-5 group-hover:opacity-80" />
          <span className="text-sm group-hover:opacity-80">
            Sign In
          </span>
        </button>
      )}
    </div>
  );
}