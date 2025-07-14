'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Megaphone,
  Target,
  CreditCard,
  HelpCircle,
  FileText,
  User
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

  return (
    <div className="sidebar w-56 h-screen fixed left-0 top-0 flex flex-col border-r">
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
              className={`nav-item flex items-center space-x-2 px-3 py-2 mx-3 mt-3 rounded-md text-sm ${
                isActive ? 'active' : ''
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}