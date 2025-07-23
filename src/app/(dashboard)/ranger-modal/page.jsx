// src/app/RangerModal/page.jsx

"use client"

import { Upload, Trophy, Download, AlertCircle, Wallet, X, DollarSign, CheckCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function RangerModal() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [walletBalance, setWalletBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);
  const [buttonsLocked, setButtonsLocked] = useState({
    slotlist: false,
    result: false
  });
  const [processingPayment, setProcessingPayment] = useState(false);
  const [processing, setProcessing] = useState({
    slotlist: false,
    result: false
  });
  const [downloadLinks, setDownloadLinks] = useState({
    slotlist: null,
    result: null
  });
  
  // New state for auto-population
  const [autoPopulatedCSV, setAutoPopulatedCSV] = useState({
    csvId: null,
    filename: null,
    isPopulated: false,
    csvData: null
  });
  
  // Ref for the file input
  const slotlistFileInputRef = useRef(null);

  // Check if both features are used
  const bothFeaturesUsed = buttonsLocked.slotlist && buttonsLocked.result;

  // Fetch wallet balance on component mount
  useEffect(() => {
    const fetchWalletBalance = async () => {
      if (status === "loading") return;
      
      if (!session) {
        router.push('/auth/signin');
        return;
      }

      try {
        const response = await fetch('/api/wallet');
        if (response.ok) {
          const data = await response.json();
          setWalletBalance(data.wallet.balance);
          setHasAccess(data.wallet.balance >= 3);
        } else {
          console.error('Failed to fetch wallet balance');
          setHasAccess(false);
        }
      } catch (error) {
        console.error('Error fetching wallet balance:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    fetchWalletBalance();
  }, [session, status, router]);

  // Show access modal when component loads and user has sufficient balance
  useEffect(() => {
    if (!loading && hasAccess && !accessGranted) {
      setShowAccessModal(true);
    }
  }, [loading, hasAccess, accessGranted]);

  // Handle access payment
  const handleAccessPayment = async () => {
    setProcessingPayment(true);
    
    try {
      const response = await fetch('/api/wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: 3,
          type: 'debit',
          title: 'Ranger Modal Access',
          description: 'Access fee for Ranger Modal features'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setWalletBalance(data.wallet.balance);
        setAccessGranted(true);
        setShowAccessModal(false);
        
        // Show success message
        alert('Payment successful! You now have access to Ranger Modal features.');
      } else {
        const errorData = await response.json();
        alert(`Payment failed: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const processCombinedSlotlist = async () => {
    if (!accessGranted || buttonsLocked.slotlist) return;
    
    const slotlistPoster = document.getElementById('slotlist-poster').files[0];
    const slotScreenshots = document.getElementById('slot-upload-combined').files;
    
    if (!slotlistPoster || slotScreenshots.length === 0) {
      alert('Please upload both slotlist poster and slot screenshots');
      return;
    }

    setProcessing(prev => ({ ...prev, slotlist: true }));
    
    try {
      const formData = new FormData();
      formData.append('slotlistPoster', slotlistPoster);
      
      for (let i = 0; i < slotScreenshots.length; i++) {
        formData.append('slotScreenshots', slotScreenshots[i]);
      }

      const response = await fetch('/api/ranger/slotlist', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        
        // Create downloadable CSV file
        const blob = new Blob([data.csvData], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        setDownloadLinks(prev => ({ ...prev, slotlist: url }));
        setButtonsLocked(prev => ({ ...prev, slotlist: true }));
        
        // Auto-populate the CSV data for Step 2
        if (data.autoPopulate && data.autoPopulate.enabled) {
          setAutoPopulatedCSV({
            csvId: data.csvId,
            filename: data.autoPopulate.filename,
            isPopulated: true,
            csvData: data.csvData
          });
          
          // Create a virtual file and populate the file input
          const csvFile = new File([data.csvData], data.autoPopulate.filename, {
            type: 'text/csv'
          });
          
          // Create a DataTransfer object to simulate file selection
          const dt = new DataTransfer();
          dt.items.add(csvFile);
          
          // Set the files to the input element
          if (slotlistFileInputRef.current) {
            slotlistFileInputRef.current.files = dt.files;
          }
        }
        
        alert(`Slotlist CSV generated successfully! Found ${data.playerCount} players across ${data.teamNames.length} teams.\n\nThe CSV has been automatically loaded into Step 2 for your convenience.`);
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error processing slotlist:', error);
      alert('Failed to process slotlist. Please try again.');
    } finally {
      setProcessing(prev => ({ ...prev, slotlist: false }));
    }
  };

  const processResultScreenshots = async () => {
    if (!accessGranted || buttonsLocked.result) return;
    
    const slotlistFile = document.getElementById('slotlist-file').files[0];
    const resultScreenshots = document.getElementById('result-upload').files;
    const matchesPlayed = document.getElementById('matches-played').value;
    const groupName = document.getElementById('group-name').value;
    
    // Check if we have either uploaded file or auto-populated CSV
    if (!slotlistFile && !autoPopulatedCSV.isPopulated) {
      alert('Please upload slotlist CSV file or generate it from Step 1 first');
      return;
    }
    
    if (resultScreenshots.length === 0) {
      alert('Please upload result screenshots');
      return;
    }

    setProcessing(prev => ({ ...prev, result: true }));
    
    try {
      const formData = new FormData();
      
      // Use auto-populated CSV if available, otherwise use uploaded file
      if (autoPopulatedCSV.isPopulated && autoPopulatedCSV.csvId) {
        formData.append('csvId', autoPopulatedCSV.csvId);
      } else if (slotlistFile) {
        formData.append('slotlistFile', slotlistFile);
      }
      
      formData.append('matchesPlayed', matchesPlayed);
      formData.append('groupName', groupName);
      
      for (let i = 0; i < resultScreenshots.length; i++) {
        formData.append('resultScreenshots', resultScreenshots[i]);
      }

      const response = await fetch('/api/ranger/match-results', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        
        // Create downloadable CSV file
        const blob = new Blob([data.csvData], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        setDownloadLinks(prev => ({ ...prev, result: url }));
        setButtonsLocked(prev => ({ ...prev, result: true }));
        
        alert(`Match results CSV generated successfully! Processed ${data.summary.totalMatches} matches for group ${data.summary.groupName}.`);
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error processing match results:', error);
      alert('Failed to process match results. Please try again.');
    } finally {
      setProcessing(prev => ({ ...prev, result: false }));
    }
  };

  // Reset access (user needs to pay again)
  const resetAccess = () => {
    setAccessGranted(false);
    setButtonsLocked({ slotlist: false, result: false });
    setDownloadLinks({ slotlist: null, result: null });
    setAutoPopulatedCSV({
      csvId: null,
      filename: null,
      isPopulated: false,
      csvData: null
    });
    // Clear the file input
    if (slotlistFileInputRef.current) {
      slotlistFileInputRef.current.value = '';
    }
    setShowAccessModal(true);
  };

  // Loading state
  if (loading) {
    return (
      <div className="mx-auto px-4 sm:px-6 pt-10 md:pt-0 flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--purple-primary)' }}></div>
          <div className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Loading wallet information...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto px-4 sm:px-6 pt-10 md:pt-0">
      {/* Access Confirmation Modal */}
      {showAccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Access Ranger Modal
              </h3>
              <button
                onClick={() => {
                  setShowAccessModal(false);
                  router.push('/');
                }}
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
                onClick={() => {
                  setShowAccessModal(false);
                  router.push('/');
                }}
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
      )}

      <div className="max-h-screen overflow-hidden">
        {/* Header */}
        <div className="py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
              Ranger Modal
            </h2>
          </div>
          
          {/* Wallet Balance Display */}
          <div className="mt-2 flex items-center space-x-2">
            <Wallet className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Wallet Balance: <span className="font-semibold" style={{ color: walletBalance >= 3 ? '#16a34a' : '#dc2626' }}>
                ₹{walletBalance?.toFixed(2) || '0.00'}
              </span>
            </span>
            {accessGranted && (
              <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                Access Granted
              </span>
            )}

            {accessGranted && (
              <motion.button
                onClick={resetAccess}
                className={`text-sm px-3 py-1 ${bothFeaturesUsed ? 'bg-red-500 hover:bg-red-600' : 'bg-purple-500 hover:bg-purple-600'} text-white rounded transition-colors cursor-pointer`}
                animate={bothFeaturesUsed ? {
                  scale: [1, 1.1, 1],
                  boxShadow: [
                    "0 0 0 0px rgba(239, 68, 68, 0.7)",
                    "0 0 0 10px rgba(239, 68, 68, 0)",
                    "0 0 0 0px rgba(239, 68, 68, 0)"
                  ]
                } : {}}
                transition={bothFeaturesUsed ? {
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                } : {}}
              >
                {bothFeaturesUsed ? (
                  <motion.span
                    animate={{
                      color: ["#ffffff", "#ffff00", "#ffffff"]
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    🔄 Reset Access
                  </motion.span>
                ) : (
                  "Reset Access"
                )}
              </motion.button>
            )}
          </div>
        </div>
      </div>
      
      {/* Access Restriction Notice */}
      {!hasAccess && (
        <div className="card rounded-lg p-4 sm:p-6 shadow-sm border mb-6" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
          <div className="flex items-center mb-3">
            <AlertCircle className="w-5 h-5 mr-2" style={{ color: '#dc2626' }} />
            <h3 className="text-lg font-semibold" style={{ color: '#dc2626' }}>
              Insufficient Wallet Balance
            </h3>
          </div>
          <p className="text-sm mb-4" style={{ color: '#991b1b' }}>
            You need at least ₹3.00 in your wallet to access the Ranger Modal features. 
            Your current balance is ₹{walletBalance?.toFixed(2) || '0.00'}.
          </p>
          <button
            className="font-medium py-2 px-4 rounded-lg transition-all duration-200 text-sm"
            style={{ 
              backgroundColor: '#dc2626',
              color: '#ffffff'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#b91c1c'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#dc2626'}
            onClick={() => router.push('/wallet')}
          >
            Add Money to Wallet
          </button>
        </div>
      )}

      {/* Step 1: Combined Slotlist */}
      <div className={`card rounded-lg p-4 sm:p-6 shadow-sm border mb-6 ${!accessGranted ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex items-center mb-4">
          <h2 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Ranger Modal - Step 1: Combined Slotlist
          </h2>
          <Upload className="ml-auto w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          {buttonsLocked.slotlist && (
            <span className="ml-2 text-xs px-2 py-1 bg-red-100 text-red-800 rounded">
              Used
            </span>
          )}
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Upload Slotlist Poster (Team Names)
            </label>
            <input
              type="file"
              id="slotlist-poster"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors duration-200 bg-black text-white dark:bg-black dark:text-white file:bg-gray-800 file:border-gray-600 file:text-white file:rounded file:px-3 file:py-1 file:mr-3 file:cursor-pointer hover:file:bg-gray-700"
              style={{ 
                borderColor: 'var(--border-color)',
                focusRingColor: 'var(--purple-primary)'
              }}
              accept="image/*"
              disabled={!accessGranted || buttonsLocked.slotlist || processing.slotlist}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Upload Slot Screenshots (Player Names)
            </label>
            <input
              type="file"
              id="slot-upload-combined"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors duration-200 bg-black text-white dark:bg-black dark:text-white file:bg-gray-800 file:border-gray-600 file:text-white file:rounded file:px-3 file:py-1 file:mr-3 file:cursor-pointer hover:file:bg-gray-700"
              style={{ 
                borderColor: 'var(--border-color)',
                focusRingColor: 'var(--purple-primary)'
              }}
              accept="image/*"
              multiple
              disabled={!accessGranted || buttonsLocked.slotlist || processing.slotlist}
            />
          </div>
          
          <button
            className="w-full font-medium py-2.5 px-4 rounded-lg transition-all duration-200 text-sm hover:transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            style={{ 
              backgroundColor: (accessGranted && !buttonsLocked.slotlist && !processing.slotlist) ? 'var(--purple-primary)' : '#6b7280',
              color: '#ffffff'
            }}
            onMouseEnter={(e) => {
              if (accessGranted && !buttonsLocked.slotlist && !processing.slotlist) e.target.style.backgroundColor = 'var(--purple-hover)';
            }}
            onMouseLeave={(e) => {
              if (accessGranted && !buttonsLocked.slotlist && !processing.slotlist) e.target.style.backgroundColor = 'var(--purple-primary)';
            }}
            onClick={processCombinedSlotlist}
            disabled={!accessGranted || buttonsLocked.slotlist || processing.slotlist}
          >
            {!accessGranted ? 'Access Required - Pay ₹3.00 to Continue' : 
             processing.slotlist ? 'Processing Images with AI...' :
             buttonsLocked.slotlist ? 'Feature Used - Reset Access to Use Again' : 
             'Generate Final Slotlist CSV'}
          </button>
        </div>
      </div>

      {/* Step 2: Match Result */}
      <div className={`card rounded-lg p-4 sm:p-6 shadow-sm border mb-6 ${!accessGranted ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex items-center mb-4">
          <h2 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Ranger Modal - Step 2: Match Result
          </h2>
          <Trophy className="ml-auto w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          {buttonsLocked.result && (
            <span className="ml-2 text-xs px-2 py-1 bg-red-100 text-red-800 rounded">
              Used
            </span>
          )}
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Upload Slotlist CSV (from Step 1)
              {autoPopulatedCSV.isPopulated && (
                <span className="ml-2 text-xs px-2 py-1 bg-green-100 text-green-800 rounded inline-flex items-center">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Auto-populated
                </span>
              )}
            </label>
            <input
              ref={slotlistFileInputRef}
              type="file"
              id="slotlist-file"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors duration-200 bg-black text-white dark:bg-black dark:text-white file:bg-gray-800 file:border-gray-600 file:text-white file:rounded file:px-3 file:py-1 file:mr-3 file:cursor-pointer hover:file:bg-gray-700"
              style={{ 
                borderColor: autoPopulatedCSV.isPopulated ? '#16a34a' : 'var(--border-color)',
                focusRingColor: 'var(--purple-primary)'
              }}
              accept=".csv"
              disabled={!accessGranted || buttonsLocked.result || processing.result}
            />
            {autoPopulatedCSV.isPopulated && (
              <p className="text-xs mt-1 text-green-600">
                ✓ CSV automatically loaded from Step 1: {autoPopulatedCSV.filename}
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Matches Played
            </label>
            <input
              type="number"
              id="matches-played"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors duration-200"
              style={{ 
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
                focusRingColor: 'var(--purple-primary)'
              }}
              min="1"
              defaultValue="1"
              disabled={!accessGranted || buttonsLocked.result || processing.result}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Group Name
            </label>
            <input
              type="text"
              id="group-name"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors duration-200"
              style={{ 
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
                focusRingColor: 'var(--purple-primary)'
              }}
              defaultValue="G1"
              disabled={!accessGranted || buttonsLocked.result || processing.result}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Upload Match Result Screenshot(s)
            </label>
            <input
              type="file"
              id="result-upload"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors duration-200 bg-black text-white dark:bg-black dark:text-white file:bg-gray-800 file:border-gray-600 file:text-white file:rounded file:px-3 file:py-1 file:mr-3 file:cursor-pointer hover:file:bg-gray-700"
              style={{ 
                borderColor: 'var(--border-color)',
                focusRingColor: 'var(--purple-primary)'
              }}
              accept="image/*"
              multiple
              disabled={!accessGranted || buttonsLocked.result || processing.result}
            />
            <button
              className="w-full mt-3 font-medium py-2.5 px-4 rounded-lg transition-all duration-200 text-sm hover:transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              style={{ 
                backgroundColor: (accessGranted && !buttonsLocked.result && !processing.result) ? 'var(--purple-primary)' : '#6b7280',
                color: '#ffffff'
              }}
              onMouseEnter={(e) => {
                if (accessGranted && !buttonsLocked.result && !processing.result) e.target.style.backgroundColor = 'var(--purple-hover)';
              }}
              onMouseLeave={(e) => {
                if (accessGranted && !buttonsLocked.result && !processing.result) e.target.style.backgroundColor = 'var(--purple-primary)';
              }}
              onClick={processResultScreenshots}
              disabled={!accessGranted || buttonsLocked.result || processing.result}
            >
              {!accessGranted ? 'Access Required - Pay ₹3.00 to Continue' : 
               processing.result ? 'Processing Results with AI...' :
               buttonsLocked.result ? 'Feature Used - Reset Access to Use Again' : 
               'Generate Match Result CSV'}
            </button>
          </div>
        </div>
      </div>

      {/* Download Files */}
      {(downloadLinks.slotlist || downloadLinks.result) && (
        <div className="card rounded-lg p-4 sm:p-6 shadow-sm border">
          <div className="flex items-center mb-4">
            <h2 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Download Your Files
            </h2>
            <Download className="ml-auto w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          </div>
          
          <div className="space-y-3">
            {downloadLinks.slotlist && (
              <a
                href={downloadLinks.slotlist}
                download="slotlist.csv"
                className="block w-full font-medium py-2.5 px-4 rounded-lg transition-all duration-200 text-center text-sm hover:transform hover:-translate-y-0.5"
                style={{ 
                  backgroundColor: '#16a34a',
                  color: '#ffffff'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#15803d'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#16a34a'}
              >
                Download Slotlist CSV
              </a>
            )}
            
            {downloadLinks.result && (
              <a
                href={downloadLinks.result}
                download="match_results.csv"
                className="block w-full font-medium py-2.5 px-4 rounded-lg transition-all duration-200 text-center text-sm hover:transform hover:-translate-y-0.5"
                style={{ 
                  backgroundColor: '#2563eb',
                  color: '#ffffff'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#2563eb'}
              >
                Download Match Result CSV
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}