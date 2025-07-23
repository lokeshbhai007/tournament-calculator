"use client";

import { Wallet, Plus, Minus, RefreshCw, MessageCircle, X, User, Mail } from "lucide-react";
import { useState, useEffect } from "react";

export default function WalletPage() {
  const [walletData, setWalletData] = useState({
    balance: 0,
    totalDeposited: 0,
    totalWithdrawn: 0,
  });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Recharge modal states
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [rechargeMessage, setRechargeMessage] = useState("");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [whatsappNumber] = useState("917360098146");

  // Fetch wallet data and transactions on component mount
  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      }

      const response = await fetch("/api/wallet");
      if (response.ok) {
        const data = await response.json();
        setWalletData(data.wallet);
        setTransactions(data.transactions || []);
      } else {
        console.error("Failed to fetch wallet data");
      }
    } catch (error) {
      console.error("Error fetching wallet data:", error);
    } finally {
      setLoading(false);
      if (showRefreshIndicator) {
        setRefreshing(false);
      }
    }
  };

  const handleRefresh = () => {
    fetchWalletData(true);
  };

  const handleRechargeRequest = () => {
    // Validate amount
    if (!rechargeAmount || parseFloat(rechargeAmount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    // Construct the message with contact information
    let fullMessage = `Hi! I want to recharge my wallet with ₹${rechargeAmount}.`;
    
    // Add contact information if provided
    if (userName || userEmail) {
      fullMessage += "\n\nContact Information:";
      if (userName) {
        fullMessage += `\nName: ${userName}`;
      }
      if (userEmail) {
        fullMessage += `\nEmail: ${userEmail}`;
      }
    }
    
    // Add additional message if provided
    if (rechargeMessage) {
      fullMessage += `\n\nAdditional info: ${rechargeMessage}`;
    }
    
    // Encode the message for URL
    const encodedMessage = encodeURIComponent(fullMessage);
    
    // Construct WhatsApp URL
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    
    console.log("WhatsApp URL:", whatsappUrl); // Debug log
    console.log("Phone Number:", whatsappNumber); // Debug log
    console.log("Message:", fullMessage); // Debug log
    
    // Open WhatsApp
    try {
      window.open(whatsappUrl, '_blank');
      
      // Show success message
      alert("WhatsApp opened! Please send the message to complete your recharge request.");
      
      // Reset form and close modal
      setRechargeAmount("");
      setRechargeMessage("");
      setUserName("");
      setUserEmail("");
      setShowRechargeModal(false);
    } catch (error) {
      console.error("Error opening WhatsApp:", error);
      alert("Unable to open WhatsApp. Please try again or contact support.");
    }
  };

  const quickAmounts = [100, 500, 1000];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
            <h2 className="text-2xl font-bold text-gray-800">Loading Wallet</h2>
            <p className="text-gray-400">Preparing your wallet history...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto px-4 sm:px-6 pt-10 md:pt-0">
      <div
        className="max-h-screen overflow-hidden"
        style={{
          backgroundColor: "var(--bg-primary)",
          color: "var(--text-primary)",
        }}
      >
        {/* Header */}
        <div className="py-4 flex justify-between items-center">
          <h2
            className="text-xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Your Wallet
          </h2>
          
        </div>
      </div>

      {/* Wallet Balance Card */}
      <div className="max-w-md mx-auto mb-8">
        <div className="card rounded-lg p-6 shadow-sm border text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="flex">
              <h2
                className="text-lg sm:text-xl font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                Your Wallet
              </h2>
              <Wallet
                className="ml-3 w-6 h-6"
                style={{ color: "var(--text-secondary)" }}
              />
            </div>
          </div>

          <div
            className="text-4xl font-bold mb-6"
            style={{ color: "var(--purple-primary)" }}
          >
            ₹{walletData.balance.toFixed(2)}
          </div>

          {/* Recharge Button */}
          <button
            onClick={() => setShowRechargeModal(true)}
            className="px-6 py-3 rounded-lg flex items-center mx-auto gap-2 transition-colors mb-6"
            style={{
              backgroundColor: "var(--purple-primary)",
              color: "#ffffff",
            }}
          >
            <Plus className="w-5 h-5" />
            Recharge Wallet
          </button>

          {/* Wallet Stats */}
          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div
              className="p-3 rounded-lg"
              style={{ backgroundColor: "var(--bg-secondary)" }}
            >
              <div style={{ color: "var(--text-secondary)" }}>
                Total Deposited
              </div>
              <div className="font-bold text-green-600">
                ₹{walletData.totalDeposited.toFixed(2)}
              </div>
            </div>
            <div
              className="p-3 rounded-lg"
              style={{ backgroundColor: "var(--bg-secondary)" }}
            >
              <div style={{ color: "var(--text-secondary)" }}>
                Total Withdrawn
              </div>
              <div className="font-bold text-red-600">
                ₹{walletData.totalWithdrawn.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="mb-6">
        <div
          className="text-lg sm:text-xl font-bold mb-4 flex justify-between"
          style={{ color: "var(--text-primary)" }}
        >
          Transaction History
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            style={{
              backgroundColor: refreshing
                ? "var(--bg-secondary)"
                : "transparent",
            }}
          >
            <RefreshCw
              className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`}
              style={{ color: "var(--text-secondary)" }}
            />
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <p style={{ color: "var(--text-secondary)" }}>
              No transactions yet
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="card rounded-lg p-4 shadow-sm border"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3
                    className="font-semibold text-sm"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {transaction.title}
                  </h3>
                  <span
                    className="font-bold text-sm"
                    style={{
                      color:
                        transaction.type === "credit" ? "#4caf50" : "#f44336",
                    }}
                  >
                    {transaction.type === "credit" ? "+" : "-"}₹
                    {transaction.amount.toFixed(2)}
                  </span>
                </div>

                {transaction.description && (
                  <p
                    className="text-xs mb-2"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {transaction.description}
                  </p>
                )}

                <div className="flex justify-between items-center">
                  <div
                    className="text-xs px-2 py-1 rounded-full inline-block"
                    style={{
                      backgroundColor: "var(--purple-primary)",
                      color: "#ffffff",
                    }}
                  >
                    {transaction.date}
                  </div>

                  <div
                    className="text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Balance: ₹{transaction.balanceAfter?.toFixed(2) || "N/A"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recharge Modal */}
      {showRechargeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="card rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                {/* <h3 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                  Recharge Wallet
                </h3> */}
                <button
                  onClick={() => setShowRechargeModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" style={{ color: "var(--text-secondary)" }} />
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Amount Input */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
                    Recharge Amount (₹) *
                  </label>
                  <input
                    type="number"
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(e.target.value)}
                    placeholder="Enter amount"
                    min="1"
                    step="1"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-purple-500"
                    style={{
                      backgroundColor: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      borderColor: "var(--text-secondary)",
                    }}
                  />
                </div>

                {/* Quick Amount Buttons */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
                    Quick Select
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {quickAmounts.map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setRechargeAmount(amt.toString())}
                        className={`p-2 text-sm border rounded-lg hover:bg-purple-300 transition-colors ${
                          rechargeAmount === amt.toString() ? 'border-purple-500 bg-purple-400' : ''
                        }`}
                        style={{
                          borderColor: rechargeAmount === amt.toString() ? "var(--purple-primary)" : "var(--text-secondary)",
                          color: "var(--text-primary)",
                        }}
                      >
                        ₹{amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contact Information Section */}
                <div className="border-t pt-4" style={{ borderColor: "var(--text-secondary)" }}>
                  <h4 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>
                    Contact Information
                  </h4>
                  
                  <div className="space-y-3">
                    {/* Name Input */}
                    <div>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-secondary)" }} />
                        <input
                          type="text"
                          value={userName}
                          onChange={(e) => setUserName(e.target.value)}
                          placeholder="Your name"
                          maxLength={100}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:border-purple-500"
                          style={{
                            backgroundColor: "var(--bg-secondary)",
                            color: "var(--text-primary)",
                            borderColor: "var(--text-secondary)",
                          }}
                        />
                      </div>
                    </div>

                    {/* Email Input */}
                    <div>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-secondary)" }} />
                        <input
                          type="email"
                          value={userEmail}
                          onChange={(e) => setUserEmail(e.target.value)}
                          placeholder="your.email@example.com"
                          maxLength={100}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:border-purple-500"
                          style={{
                            backgroundColor: "var(--bg-secondary)",
                            color: "var(--text-primary)",
                            borderColor: "var(--text-secondary)",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Message */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
                    Additional Message (Optional)
                  </label>
                  <textarea
                    value={rechargeMessage}
                    onChange={(e) => setRechargeMessage(e.target.value)}
                    rows={2}
                    placeholder="Add any specific instructions..."
                    maxLength={500}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-purple-500 resize-none"
                    style={{
                      backgroundColor: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      borderColor: "var(--text-secondary)",
                    }}
                  />
                  <div className="text-xs text-right mt-1" style={{ color: "var(--text-secondary)" }}>
                    {rechargeMessage.length}/500
                  </div>
                </div>

                {/* Preview Message */}
                {rechargeAmount && (
                  <div className="p-3 rounded-lg border" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--text-secondary)" }}>
                    <div className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
                      Preview Message:
                    </div>
                    <div className="text-sm whitespace-pre-line" style={{ color: "var(--text-secondary)" }}>
                      Hi! I want to recharge my wallet with ₹{rechargeAmount}.
                      {(userName || userEmail) && (
                        <>
                          {"\n\nContact Information:"}
                          {userName && `\nName: ${userName}`}
                          {userEmail && `\nEmail: ${userEmail}`}
                        </>
                      )}
                      {rechargeMessage && `\n\nAdditional info: ${rechargeMessage}`}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setShowRechargeModal(false)}
                    className="flex-1 px-4 py-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    style={{
                      color: "var(--text-primary)",
                      borderColor: "var(--text-secondary)",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRechargeRequest}
                    disabled={!rechargeAmount || parseFloat(rechargeAmount) <= 0}
                    className="flex-1 px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: "#25D366", // WhatsApp green color
                      color: "#ffffff",
                    }}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Send to WhatsApp
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}