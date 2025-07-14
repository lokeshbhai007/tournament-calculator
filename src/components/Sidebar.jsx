'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  Home,
  Megaphone,
  Target,
  CreditCard,
  HelpCircle,
  FileText,
  User,
  Menu,
  X
} from 'lucide-react';

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Announcements', href: '/announcements', icon: Megaphone },
  { name: 'Ranger Modal', href: '/ranger-modal', icon: Target },
  { name: 'Wallet', href: '/wallet', icon: CreditCard },
  { name: 'Support', href: '/support', icon: HelpCircle },
  { name: 'Terms', href: '/terms', icon: FileText },
  { name: 'Profile', href: '/profile', icon: User },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Close mobile menu when route changes
  useEffect(() => {
    closeMobileMenu();
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={toggleMobileMenu}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-md border bg-white shadow-sm hover:bg-gray-50 transition-colors"
        style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}
        aria-label="Toggle mobile menu"
      >
        {isMobileMenuOpen ? (
          <X className="h-5 w-5" style={{ color: 'var(--text-primary)' }} />
        ) : (
          <Menu className="h-5 w-5" style={{ color: 'var(--text-primary)' }} />
        )}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div 
        className={`
          sidebar w-56 h-screen fixed left-0 top-0 flex flex-col border-r z-40 transform transition-transform duration-300 ease-in-out
          md:translate-x-0
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}
      >
        <div className="px-4 py-8 flex items-center justify-center">
          <h1 className="text-2xl font-bold text-purple">Ranger.AI</h1>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`nav-item flex items-center space-x-2 px-3 py-2 mx-3 mt-3 rounded-md text-sm transition-colors ${
                  isActive ? 'active' : ''
                }`}
                onClick={closeMobileMenu} // Close mobile menu on navigation
              >
                <Icon className="h-4 w-4" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}