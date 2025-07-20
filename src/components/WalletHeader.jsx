// src/components/WalletHeader.jsx

import { Wallet } from "lucide-react";

export default function WalletHeader({ walletBalance, accessGranted, onResetAccess }) {
  return (
    <div className="py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
          Ranger Modal
        </h2>
      </div>
      
      <div className="mt-2 flex items-center space-x-2">
        <Wallet className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Wallet Balance: <span className="font-semibold" style={{ color: walletBalance >= 3 ? '#16a34a' : '#dc2626' }}>
            ₹{walletBalance?.toFixed(2) || '0.00'}
          </span>
        </span>
        {accessGranted && (
          <>
            <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
              Access Granted
            </span>
            <button
              onClick={onResetAccess}
              className="text-sm px-3 py-1 bg-purple-500 hover:bg-green-600 text-white rounded transition-colors cursor-pointer"
            >
              Reset Access
            </button>
          </>
        )}
      </div>
    </div>
  );
}