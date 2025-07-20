// src/components/AccessModal.jsx

import { X, DollarSign, Wallet } from "lucide-react";

export default function AccessModal({
  showAccessModal,
  setShowAccessModal,
  walletBalance,
  processingPayment,
  handleAccessPayment,
  onCancel
}) {
  if (!showAccessModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Access Ranger Modal
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mb-6">
          <div className="flex items-center mb-3">
            <DollarSign className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-gray-700 dark:text-gray-300">
              Access fee: <span className="font-semibold text-red-500">₹3.00</span>
            </span>
          </div>
          
          <div className="flex items-center mb-3">
            <Wallet className="w-5 h-5 text-blue-500 mr-2" />
            <span className="text-gray-700 dark:text-gray-300">
              Your balance: <span className="font-semibold text-blue-500">₹{walletBalance?.toFixed(2) || '0.00'}</span>
            </span>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Do you want to access the Ranger Modal? ₹3.00 will be deducted from your wallet balance.
          </p>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              <strong>Note:</strong> Each feature can only be used once per access session. 
              To use them again, you'll need to pay the access fee again.
            </p>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAccessPayment}
            disabled={processingPayment || walletBalance < 3}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            {processingPayment ? 'Processing...' : 'Proceed (₹3.00)'}
          </button>
        </div>
      </div>
    </div>
  );
}