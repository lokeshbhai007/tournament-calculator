// app/admin/[userId]/page.jsx
"use client";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  User,
  Wallet,
  ArrowLeft,
  Plus,
  Minus,
  AlertCircle,
  CheckCircle,
  Calendar,
  Mail,
  UserCheck,
  Shield,
} from "lucide-react";

export default function UserDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const userId = params.userId;

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionType, setTransactionType] = useState("add");
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/auth/signin");
      return;
    }

    if (!session.user.isAdmin) {
      router.push("/");
      return;
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session?.user?.isAdmin && userId) {
      fetchUserDetails();
    }
  }, [session, userId]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`/api/admin/users/${userId}`);
      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
      } else {
        setError(data.error || "Failed to fetch user details");
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
      setError("Failed to fetch user details");
    } finally {
      setLoading(false);
    }
  };

  const handleWalletTransaction = async (e) => {
    e.preventDefault();

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (
      transactionType === "withdraw" &&
      parseFloat(amount) > user.walletBalance
    ) {
      setError("Insufficient wallet balance");
      return;
    }

    try {
      setTransactionLoading(true);
      setError("");
      setSuccessMessage("");

      const response = await fetch(`/api/admin/users/${userId}/wallet`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          type: transactionType,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage(
          `Successfully ${
            transactionType === "add" ? "added" : "withdrawn"
          } ₹${amount}`
        );
        setAmount("");
        fetchUserDetails(); // Refresh user data
      } else {
        setError(data.error || "Transaction failed");
      }
    } catch (error) {
      console.error("Error processing transaction:", error);
      setError("Transaction failed");
    } finally {
      setTransactionLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!session?.user?.isAdmin) {
    return null;
  }

  return (
    <div className="mx-auto px-4 sm:px-6 pt-10 md:pt-0">
      <div className="max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="py-4 flex items-center space-x-4">
          <button
            onClick={() => router.push("/admin")}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
            style={{ backgroundColor: "var(--bg-secondary)" }}
          >
            <ArrowLeft
              className="h-5 w-5"
              style={{ color: "var(--text-primary)" }}
            />
          </button>
          <h2
            className="text-xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            User Management
          </h2>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="card rounded-lg p-4 shadow-sm border mb-6 bg-red-50 border-red-200">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="card rounded-lg p-4 shadow-sm border mb-6 bg-green-50 border-green-200">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <p className="text-green-700">{successMessage}</p>
            </div>
          </div>
        )}

        {/* User Details */}
        {user && (
          <div className="space-y-6">
            {/* User Info Card */}
            <div className="card rounded-lg px-6 py-3 shadow-sm border">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                    <User className="h-8 w-8 text-purple-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3
                      className="text-2xl font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {user.name}
                    </h3>
                    {user.isAdmin && (
                      <span className="px-3 py-1 text-sm rounded-full bg-red-100 text-red-800 flex items-center space-x-1">
                        <Shield className="h-4 w-4" />
                        <span>Admin</span>
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="space-y-2 flex justify-between items-center">
                      <div>
                        <div className="flex items-center space-x-2">
                          <Mail
                            className="h-4 w-4"
                            style={{ color: "var(--text-secondary)" }}
                          />
                          <span style={{ color: "var(--text-secondary)" }}>
                            {user.email}
                          </span>
                        </div>
                        {user.username && (
                          <div className="flex items-center space-x-2">
                            <UserCheck
                              className="h-4 w-4"
                              style={{ color: "var(--text-secondary)" }}
                            />
                            <span style={{ color: "var(--text-secondary)" }}>
                              @{user.username}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <Calendar
                          className="h-4 w-4"
                          style={{ color: "var(--text-secondary)" }}
                        />
                        <span style={{ color: "var(--text-secondary)" }}>
                          Joined:{" "}
                          {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>


                  </div>
                </div>
              </div>
            </div>

            {/* Wallet Management Card */}
            <div className="card rounded-lg p-6 shadow-sm border">
              <div className="flex items-center space-x-2 mb-6">
                <Wallet className="h-6 w-6 text-purple-600" />
                <h3
                  className="text-lg font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Wallet Management
                </h3>
              </div>

              {/* Current Balance */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 mb-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">Current Balance</p>
                  <p className="text-3xl font-bold text-purple-600">
                    ₹{user.walletBalance || 0}
                  </p>
                </div>
              </div>

              {/* Transaction Form */}
              <form onSubmit={handleWalletTransaction} className="space-y-4">
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Transaction Type
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="transactionType"
                        value="add"
                        checked={transactionType === "add"}
                        onChange={(e) => setTransactionType(e.target.value)}
                        className="text-purple-600 focus:ring-purple-500"
                      />
                      <span
                        className="flex items-center space-x-1"
                        style={{ color: "var(--text-primary)" }}
                      >
                        <Plus className="h-4 w-4 text-green-600" />
                        <span>Add Money</span>
                      </span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="transactionType"
                        value="withdraw"
                        checked={transactionType === "withdraw"}
                        onChange={(e) => setTransactionType(e.target.value)}
                        className="text-purple-600 focus:ring-purple-500"
                      />
                      {/* <span className="flex items-center space-x-1" style={{ color: 'var(--text-primary)' }}>
                        <Minus className="h-4 w-4 text-red-600" />
                        <span>Withdraw Money</span>
                      </span> */}
                    </label>
                  </div>
                </div>

                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    style={{
                      backgroundColor: "var(--bg-primary)",
                      borderColor: "var(--border-color)",
                      color: "var(--text-primary)",
                    }}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={transactionLoading}
                  className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
                    transactionType === "add"
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  } ${
                    transactionLoading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {transactionLoading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    <span className="flex items-center justify-center space-x-2">
                      {transactionType === "add" ? (
                        <Plus className="h-4 w-4" />
                      ) : (
                        <Minus className="h-4 w-4" />
                      )}
                      <span>
                        {transactionType === "add"
                          ? "Add Money"
                          : "Withdraw Money"}
                      </span>
                    </span>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
