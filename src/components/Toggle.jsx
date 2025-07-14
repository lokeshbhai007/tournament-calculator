'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function Toggle() {
  const [isDark, setIsDark] = useState(true); // Default to dark
  const [isHydrated, setIsHydrated] = useState(false);

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

  // Don't render until hydrated to prevent hydration mismatch
  if (!isHydrated) {
    return (
      <button
        className="theme-toggle fixed top-4 right-4 z-50 p-2 rounded-lg border transition-all duration-200 hover:scale-105"
        aria-label="Toggle theme"
      >
        <Sun className="w-5 h-5" />
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle fixed top-5 right-4 z-50 p-1.5 rounded-lg border transition-all duration-200 hover:scale-105 cursor-pointer"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  );
}