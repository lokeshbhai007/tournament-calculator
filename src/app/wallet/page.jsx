"use client"

import { Wallet, Plus, Minus } from "lucide-react";
import { useState } from "react";

export default function WalletPage() {
  const [balance] = useState(1245.75);
  
  const transactions = [
    {
      id: 1,
      title: "Recharged",
      amount: 500.00,
      type: "credit",
      date: "June 10, 2025"
    },
    {
      id: 2,
      title: "Point Calculated",
      amount: 50.00,
      type: "debit",
      date: "May 25, 2025"
    },
    {
      id: 3,
      title: "Recharged",
      amount: 200.00,
      type: "credit",
      date: "May 20, 2023"
    }
  ];

  const handleDeposit = () => {
    // Handle deposit logic
    console.log('Deposit clicked');
  };

  const handleWithdraw = () => {
    // Handle withdraw logic
    console.log('Withdraw clicked');
  };

  return (
    <div className="mx-auto px-4 sm:px-6">
      <div className="max-h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        {/* Header */}
        <div className="py-4">
          <h2 className="text-xl font-bold " style={{  color: 'var(--text-primary)' }}>Your Wallet</h2>
        </div>
      </div>
      
      {/* Wallet Balance Card */}
      <div className="max-w-md mx-auto mb-8">
        <div className="card rounded-lg p-6 shadow-sm border text-center">
          <div className="flex items-center justify-center mb-6">
            <h2 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Your Wallet
            </h2>
            <Wallet className="ml-3 w-6 h-6" style={{ color: 'var(--text-secondary)' }} />
          </div>
          
          <div className="text-4xl font-bold mb-6" style={{ color: 'var(--purple-primary)' }}>
            ₹{balance.toFixed(2)}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleDeposit}
              className="flex-1 flex items-center justify-center font-medium py-2.5 px-4 rounded-lg transition-all duration-200 text-sm hover:transform hover:-translate-y-0.5"
              style={{ 
                backgroundColor: '#16a34a',
                color: '#ffffff'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#15803d'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#16a34a'}
            >
              <Plus className="w-4 h-4 mr-2" />
              Deposit
            </button>
            
            <button
              onClick={handleWithdraw}
              className="flex-1 flex items-center justify-center font-medium py-2.5 px-4 rounded-lg transition-all duration-200 text-sm hover:transform hover:-translate-y-0.5"
              style={{ 
                backgroundColor: '#dc2626',
                color: '#ffffff'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#b91c1c'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#dc2626'}
            >
              <Minus className="w-4 h-4 mr-2" />
              Withdraw
            </button>
          </div>
        </div>
      </div>

      {/* Transaction History Section */}
      <div className="mb-6">
        <h2 className="text-lg sm:text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Transaction History
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="card rounded-lg p-4 shadow-sm border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  {transaction.title}
                </h3>
                <span 
                  className="font-bold text-sm"
                  style={{ 
                    color: transaction.type === 'credit' ? '#4caf50' : '#f44336' 
                  }}
                >
                  {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount.toFixed(2)}
                </span>
              </div>
              
              <div className="text-xs px-2 py-1 rounded-full inline-block" style={{ 
                backgroundColor: 'var(--purple-primary)', 
                color: '#ffffff' 
              }}>
                {transaction.date}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}