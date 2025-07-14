"use client"

import { User } from "lucide-react";
import { useState } from "react";

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('wallet');
  const [profileData, setProfileData] = useState({
    name: 'Player One',
    email: 'player@email.com',
    username: 'playerone'
  });

  const walletHistory = [
    {
      id: 1,
      amount: 500.00,
      type: 'credit',
      description: 'Deposit',
      date: 'June 10, 2025'
    },
    {
      id: 2,
      amount: 50.00,
      type: 'debit',
      description: 'Point Calculated',
      date: 'May 25, 2025'
    },
    {
      id: 3,
      amount: 200.00,
      type: 'credit',
      description: 'Deposit',
      date: 'May 20, 2023'
    }
  ];

  const tournamentHistory = [
    {
      id: 1,
      name: 'BGMI Summer Cup',
      result: '1st Place'
    },
    {
      id: 2,
      name: 'Valorant Showdown',
      result: 'Top 8'
    },
    {
      id: 3,
      name: 'Free Fire Open',
      result: '2nd Place'
    }
  ];

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    const fieldName = id.replace('profile-', '');
    setProfileData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission
    console.log('Profile updated:', profileData);
    alert('Profile updated successfully!');
  };

  return (
    <div className="mx-auto px-4 sm:px-6">
      <div className="max-h-screen overflow-hidden">
        {/* Header */}
        <div className="py-4">
          <h2 className="text-xl font-bold " style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>User Profile</h2>
        </div>
      </div>
      
      <div className="max-w-4xl mx-auto">
        <div className="card rounded-lg p-6 shadow-sm border">
          <div className="flex items-center mb-6">
            <h2 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              User Profile
            </h2>
            <User className="ml-auto w-6 h-6" style={{ color: 'var(--text-secondary)' }} />
          </div>
          
          {/* Profile Form */}
          <form onSubmit={handleSubmit} className="space-y-4 mb-8">
            <div>
              <label htmlFor="profile-name" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Name
              </label>
              <input
                type="text"
                id="profile-name"
                value={profileData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors duration-200"
                style={{ 
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                  focusRingColor: 'var(--purple-primary)'
                }}
                required
              />
            </div>
            
            <div>
              <label htmlFor="profile-email" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Email
              </label>
              <input
                type="email"
                id="profile-email"
                value={profileData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors duration-200"
                style={{ 
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                  focusRingColor: 'var(--purple-primary)'
                }}
                required
              />
            </div>
            
            <div>
              <label htmlFor="profile-username" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Username
              </label>
              <input
                type="text"
                id="profile-username"
                value={profileData.username}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors duration-200"
                style={{ 
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                  focusRingColor: 'var(--purple-primary)'
                }}
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full font-medium py-2.5 px-4 rounded-lg transition-all duration-200 text-sm hover:transform hover:-translate-y-0.5"
              style={{ 
                backgroundColor: 'var(--purple-primary)',
                color: '#ffffff'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--purple-hover)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--purple-primary)'}
            >
              Save Changes
            </button>
          </form>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('wallet')}
              className={`flex-1 font-medium py-2.5 px-4 rounded-lg transition-all duration-200 text-sm ${
                activeTab === 'wallet' 
                  ? 'text-white' 
                  : 'text-purple-400'
              }`}
              style={{ 
                backgroundColor: activeTab === 'wallet' 
                  ? 'var(--purple-primary)' 
                  : 'rgba(138,43,226,0.15)'
              }}
            >
              Wallet History
            </button>
            
            <button
              onClick={() => setActiveTab('tournament')}
              className={`flex-1 font-medium py-2.5 px-4 rounded-lg transition-all duration-200 text-sm ${
                activeTab === 'tournament' 
                  ? 'text-white' 
                  : 'text-purple-400'
              }`}
              style={{ 
                backgroundColor: activeTab === 'tournament' 
                  ? 'var(--purple-primary)' 
                  : 'rgba(138,43,226,0.15)'
              }}
            >
              Tournament History
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'wallet' && (
            <div className="space-y-3">
              {walletHistory.map((transaction) => (
                <div key={transaction.id} className="flex justify-between items-center py-2">
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount.toFixed(2)} ({transaction.description})
                  </span>
                  <span 
                    className="text-sm font-medium"
                    style={{ 
                      color: transaction.type === 'credit' ? '#4caf50' : '#f44336' 
                    }}
                  >
                    {transaction.date}
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'tournament' && (
            <div className="space-y-3">
              {tournamentHistory.map((tournament) => (
                <div key={tournament.id} className="flex justify-between items-center py-2">
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {tournament.name}
                  </span>
                  <span 
                    className="text-sm font-medium"
                    style={{ color: 'var(--purple-primary)' }}
                  >
                    {tournament.result}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}