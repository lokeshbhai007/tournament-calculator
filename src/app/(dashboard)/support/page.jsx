
"use client"

import { Megaphone } from "lucide-react";

export default function AnnouncementsPage() {
  return (
    <div className="mx-auto px-4 sm:px-6">
      <div className="max-h-screen overflow-hidden"style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        {/* Header */}
        <div className="py-4">
          <h2 className="text-xl font-bold " style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>Latest Announcements</h2>
        </div>
      </div>
      
      <div className="card rounded-lg p-4 sm:p-6 shadow-sm border">
        <div className="flex items-center mb-4">
          <h2 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Upcoming v1.2
          </h2>
          <Megaphone className="ml-auto w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
        </div>
        
        <div className="mb-4">
          <span className="text-sm font-medium px-3 py-1 rounded-full" style={{ 
            backgroundColor: 'var(--purple-primary)', 
            color: '#ffffff' 
          }}>
            September 10, 2025
          </span>
        </div>
        
        <div className="space-y-3">
          <ul className="space-y-2 pl-5">
            <li className="flex items-start">
              <span className="w-2 h-2 rounded-full mt-2 mr-3 flex-shrink-0" style={{ 
                backgroundColor: 'var(--purple-primary)' 
              }}></span>
              <span className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Major bug fixes for smoother experience
              </span>
            </li>
            
            <li className="flex items-start">
              <span className="w-2 h-2 rounded-full mt-2 mr-3 flex-shrink-0" style={{ 
                backgroundColor: 'var(--purple-primary)' 
              }}></span>
              <span className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Wallet integration for secure transactions
              </span>
            </li>
            
            <li className="flex items-start">
              <span className="w-2 h-2 rounded-full mt-2 mr-3 flex-shrink-0" style={{ 
                backgroundColor: 'var(--purple-primary)' 
              }}></span>
              <span className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Match history tracking added
              </span>
            </li>
            
            <li className="flex items-start">
              <span className="w-2 h-2 rounded-full mt-2 mr-3 flex-shrink-0" style={{ 
                backgroundColor: 'var(--purple-primary)' 
              }}></span>
              <span className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                User profile support
              </span>
            </li>
            
            <li className="flex items-start">
              <span className="w-2 h-2 rounded-full mt-2 mr-3 flex-shrink-0" style={{ 
                backgroundColor: 'var(--purple-primary)' 
              }}></span>
              <span className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Improved and modernized UI
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
