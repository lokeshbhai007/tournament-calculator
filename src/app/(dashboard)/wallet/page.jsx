"use client";

import { Wallet, Plus, Minus, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

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
        toast.error("Failed to fetch wallet data");
      }
    } catch (error) {
      console.error("Error fetching wallet data:", error);
      toast.error("Error fetching wallet data");
    } finally {
      setLoading(false);
      if (showRefreshIndicator) {
        setRefreshing(false);
      }
    }
  };

  const handleTransaction = async (type) => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch("/api/wallet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          type: type,
          title: type === "credit" ? "Money Added" : "Money Withdrawn",
          description:
            type === "credit"
              ? "Added money to wallet"
              : "Withdrew money from wallet",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(
          `₹${amount} ${
            type === "credit" ? "added to" : "withdrawn from"
          } your wallet`
        );
        setAmount("");
        // Refresh wallet data
        await fetchWalletData();
      } else {
        toast.error(data.error || "Transaction failed");
      }
    } catch (error) {
      console.error("Transaction error:", error);
      toast.error("Transaction failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRefresh = () => {
    fetchWalletData(true);
  };

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

            {/* <div>
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
            </div> */}


          </div>

          <div
            className="text-4xl font-bold mb-6"
            style={{ color: "var(--purple-primary)" }}
          >
            ₹{walletData.balance.toFixed(2)}
          </div>

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

      {/* Transaction History Section */}
      <div className="mb-6">
        <h2
          className="text-lg sm:text-xl font-bold mb-4"
          style={{ color: "var(--text-primary)" }}
        >
          Transaction History
        </h2>

        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <p style={{ color: "var(--text-secondary)" }}>
              No transactions yet
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1  gap-4">
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
    </div>
  );
}
