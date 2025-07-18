"use client"

import { Wallet, Plus, Minus } from "lucide-react";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

export default function WalletPage() {
  const [walletData, setWalletData] = useState({
    balance: 0,
    totalDeposited: 0,
    totalWithdrawn: 0
  });
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
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

  // Fetch wallet data on component mount
  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      const response = await fetch('/api/wallet');
      if (response.ok) {
        const data = await response.json();
        setWalletData(data.wallet);
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: parseFloat(amount) }),
      });

      if (response.ok) {
        const data = await response.json();
        setWalletData(data.wallet);
        setAmount('');
        toast.success('Deposit successful!');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Deposit failed');
      }
    } catch (error) {
      console.error('Deposit error:', error);
      alert('An error occurred during deposit');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (parseFloat(amount) > walletData.balance) {
      alert('Insufficient balance');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: parseFloat(amount) }),
      });

      if (response.ok) {
        const data = await response.json();
        setWalletData(data.wallet);
        setAmount('');
        toast.success('Withdrawal successful!');
      } else {
        const error = await response.json();
        alert(error.error || 'Withdrawal failed');
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      alert('An error occurred during withdrawal');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen  flex items-center justify-center">
        <div className="text-center space-y-8">
          {/* Glowing Ring Animation */}
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-gray-700"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin"></div>
            <div
              className="absolute inset-1 rounded-full border-2 border-transparent border-t-purple-400 animate-spin"
              style={{
                animationDuration: "0.8s",
                animationDirection: "reverse",
              }}
            ></div>
            <div className="absolute inset-0 rounded-full bg-blue-500 opacity-20 animate-ping"></div>
          </div>

          {/* Loading Text */}
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-gray-800">
              Loading Wallet
            </h2>
            <p className="text-gray-400">Preparing your wallet history...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto px-4 sm:px-6 pt-10 md:pt-0">
      <div className="max-h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        {/* Header */}
        <div className="py-4">
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Your Wallet</h2>
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
            ₹{walletData.balance.toFixed(2)}
          </div>

          {/* Amount Input */}
          {/* <div className="mb-4">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full p-3 border rounded-lg text-center"
              style={{ 
                borderColor: 'var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)'
              }}
              disabled={isProcessing}
            />
          </div> */}
          
          {/* <div className="flex gap-3">
            <button
              onClick={handleDeposit}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center font-medium py-2.5 px-4 rounded-lg transition-all duration-200 text-sm hover:transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                backgroundColor: '#16a34a',
                color: '#ffffff'
              }}
              onMouseEnter={(e) => !isProcessing && (e.target.style.backgroundColor = '#15803d')}
              onMouseLeave={(e) => !isProcessing && (e.target.style.backgroundColor = '#16a34a')}
            >
              <Plus className="w-4 h-4 mr-2" />
              {isProcessing ? 'Processing...' : 'Deposit'}
            </button>
            
            <button
              onClick={handleWithdraw}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center font-medium py-2.5 px-4 rounded-lg transition-all duration-200 text-sm hover:transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                backgroundColor: '#dc2626',
                color: '#ffffff'
              }}
              onMouseEnter={(e) => !isProcessing && (e.target.style.backgroundColor = '#b91c1c')}
              onMouseLeave={(e) => !isProcessing && (e.target.style.backgroundColor = '#dc2626')}
            >
              <Minus className="w-4 h-4 mr-2" />
              {isProcessing ? 'Processing...' : 'Withdraw'}
            </button>
          </div> */}

          {/* Wallet Stats */}
          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <div style={{ color: 'var(--text-secondary)' }}>Total Deposited</div>
              <div className="font-bold text-green-600">₹{walletData.totalDeposited.toFixed(2)}</div>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <div style={{ color: 'var(--text-secondary)' }}>Total Withdrawn</div>
              <div className="font-bold text-red-600">₹{walletData.totalWithdrawn.toFixed(2)}</div>
            </div>
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