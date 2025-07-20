//src/app/profile/page.jsx

"use client";

import { User, RefreshCw, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("wallet");
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    username: "",
    hasChangedUsername: false,
    usernameChangedAt: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Username checking states
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(""); // 'available', 'taken', 'error'
  const [isSaving, setIsSaving] = useState(false);

  // Wallet history states
  const [walletHistory, setWalletHistory] = useState([]);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletRefreshing, setWalletRefreshing] = useState(false);
  const [walletError, setWalletError] = useState(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Load user data from session and database
  useEffect(() => {
    if (status === "loading") return; // Still loading

    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (session?.user) {
      // Set initial data from session
      setProfileData({
        name: session.user.name || "",
        email: session.user.email || "",
        username: "", // Will be loaded from database
        hasChangedUsername: false,
        usernameChangedAt: null,
      });

      // Fetch additional user data from database
      fetchUserProfile();
    }
  }, [session, status, router]);

  // Load wallet history when wallet tab is active
  useEffect(() => {
    if (activeTab === "wallet" && session?.user && !walletLoading) {
      fetchWalletHistory(true); // Reset to first page
    }
  }, [activeTab, session]);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch("/api/profile/user-profile");
      if (response.ok) {
        const userData = await response.json();
        setProfileData((prev) => ({
          ...prev,
          username: userData.username || "",
          hasChangedUsername: userData.hasChangedUsername || false,
          usernameChangedAt: userData.usernameChangedAt || null,
        }));
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWalletHistory = async (reset = false, showRefreshIndicator = false) => {
    try {
      if (reset) {
        setWalletLoading(true);
        setCurrentPage(1);
        setWalletHistory([]);
      } else {
        setLoadingMore(true);
      }

      if (showRefreshIndicator) {
        setWalletRefreshing(true);
      }

      const page = reset ? 1 : currentPage + 1;
      const response = await fetch(`/api/transactions?limit=10&page=${page}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (reset) {
          setWalletHistory(data.transactions);
        } else {
          setWalletHistory(prev => [...prev, ...data.transactions]);
        }
        
        setCurrentPage(page);
        setHasMore(data.pagination.hasMore);
        setWalletError(null);
      } else {
        throw new Error('Failed to fetch wallet history');
      }
    } catch (error) {
      console.error("Error fetching wallet history:", error);
      setWalletError("Failed to load wallet history");
      if (reset) {
        toast.error("Failed to load wallet history");
      }
    } finally {
      setWalletLoading(false);
      setLoadingMore(false);
      if (showRefreshIndicator) {
        setWalletRefreshing(false);
      }
    }
  };

  const handleRefreshWallet = () => {
    fetchWalletHistory(true, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchWalletHistory(false);
    }
  };

  const tournamentHistory = [
    {
      id: 1,
      name: "BGMI Summer Cup",
      result: "1st Place",
      date: "June 15, 2025",
      prize: "₹5,000"
    },
    {
      id: 2,
      name: "Valorant Showdown",
      result: "Top 8",
      date: "May 28, 2025",
      prize: "₹1,000"
    },
    {
      id: 3,
      name: "Free Fire Open",
      result: "2nd Place",
      date: "May 10, 2025",
      prize: "₹2,500"
    },
  ];

  // Check username availability
  const checkUsernameAvailability = async (username) => {
    if (!username || username.length < 3) {
      setUsernameStatus("");
      return;
    }

    setIsCheckingUsername(true);
    setUsernameStatus("");

    try {
      const response = await fetch("/api/profile/check-username", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
      });

      const data = await response.json();

      if (response.ok) {
        setUsernameStatus(data.available ? "available" : "taken");
      } else {
        setUsernameStatus("error");
      }
    } catch (error) {
      console.error("Error checking username:", error);
      setUsernameStatus("error");
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    const fieldName = id.replace("profile-", "");

    setProfileData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));

    // Check username availability when username changes
    if (fieldName === "username") {
      const timeoutId = setTimeout(() => {
        checkUsernameAvailability(value);
      }, 500); // Debounce for 500ms

      return () => clearTimeout(timeoutId);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if username is available before saving
    if (usernameStatus === "taken") {
      toast.error(
        "Username is already taken. Please choose a different username."
      );
      return;
    }

    if (usernameStatus === "error") {
      toast.error("Error checking username availability. Please try again.");
      return;
    }

    if (!profileData.username || profileData.username.length < 3) {
      toast.error("Username must be at least 3 characters long.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/profile/update-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: profileData.name,
          username: profileData.username,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Profile updated successfully!");
        // Update local state with new data
        setProfileData((prev) => ({
          ...prev,
          hasChangedUsername: data.user.hasChangedUsername,
          usernameChangedAt: data.user.usernameChangedAt,
        }));
      } else {
        toast.error(
          data.error || "Failed to update profile. Please try again."
        );
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(
        "An error occurred while updating your profile. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const getUsernameStatusColor = () => {
    switch (usernameStatus) {
      case "available":
        return "text-green-500";
      case "taken":
        return "text-red-500";
      case "error":
        return "text-orange-500";
      default:
        return "text-gray-500 dark:text-gray-400";
    }
  };

  const getUsernameStatusText = () => {
    if (isCheckingUsername) return "Checking...";
    switch (usernameStatus) {
      case "available":
        return "Username is available";
      case "taken":
        return "Username is already taken";
      case "error":
        return "Error checking username";
      default:
        return "";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString();
  };

  // Show loading state
  if (status === "loading" || isLoading) {
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
            <h2 className="text-2xl font-bold text-gray-800">
              Loading Profile
            </h2>
            <p className="text-gray-400">Preparing your profile data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if not authenticated
  if (status === "unauthenticated") {
    return (
      <div className="mx-auto px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-center py-8">
              <p className="text-gray-900 dark:text-white">
                Please sign in to view your profile.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto px-4 sm:px-6 pt-10 md:pt-0">
      <div className="max-h-screen overflow-hidden">
        {/* Header */}
        <div className="py-4">
          <h2 className="text-xl font-bold">User Profile</h2>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <div
          className="rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
          style={{ color: "var(--text-primary)" }}
        >
          <div className="flex items-center mb-6">
            <h2
              className="text-lg sm:text-xl font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              User Profile
            </h2>
            <User className="ml-auto w-6 h-6" />
          </div>

          {/* Profile Form */}
          <form onSubmit={handleSubmit} className="space-y-4 mb-8">
            <div>
              <label
                htmlFor="profile-name"
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                Full Name
              </label>
              <input
                type="text"
                id="profile-name"
                value={profileData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-600 transition-colors duration-200"
                required
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label
                htmlFor="profile-email"
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                Email
              </label>
              <input
                type="email"
                id="profile-email"
                value={profileData.email}
                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed opacity-70"
                disabled
                readOnly
              />
              <p
                className="text-xs mt-1"
                style={{ color: "var(--text-primary)" }}
              >
                Email cannot be changed
              </p>
            </div>

            <div>
              <label
                htmlFor="profile-username"
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                Username
                {profileData.hasChangedUsername && (
                  <span className="ml-2 text-xs px-2 py-1 bg-purple-600 text-white rounded-full">
                    One-time change used
                  </span>
                )}
              </label>
              <input
                type="text"
                id="profile-username"
                value={profileData.username}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 transition-colors duration-200 text-gray-900 dark:text-white ${
                  profileData.hasChangedUsername
                    ? "bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-70"
                    : "bg-white dark:bg-gray-800"
                } ${
                  usernameStatus === "taken"
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
                required
                minLength={3}
                placeholder="Enter username (min 3 characters)"
                disabled={profileData.hasChangedUsername}
                readOnly={profileData.hasChangedUsername}
              />
              {profileData.hasChangedUsername && (
                <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                  Username can only be changed once and you have already used
                  this change on {formatDate(profileData.usernameChangedAt)}
                </p>
              )}
              {!profileData.hasChangedUsername &&
                (usernameStatus || isCheckingUsername) && (
                  <p
                    className={`text-xs mt-1 flex items-center gap-1 ${getUsernameStatusColor()}`}
                  >
                    {isCheckingUsername && (
                      <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></span>
                    )}
                    {getUsernameStatusText()}
                  </p>
                )}
            </div>

            <button
              type="submit"
              disabled={
                isSaving ||
                usernameStatus === "taken" ||
                isCheckingUsername ||
                profileData.hasChangedUsername
              }
              className="w-full font-medium py-2.5 px-4 bg-blue-600 hover:bg-blue-700 cursor-pointer text-white rounded-lg transition-all duration-200 text-sm hover:transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </form>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab("wallet")}
              className={`flex-1 font-medium py-2.5 px-4 rounded-lg transition-all duration-200 text-sm ${
                activeTab === "wallet"
                  ? "bg-purple-600 text-white"
                  : "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
              }`}
            >
              Wallet History
            </button>

            {/* <button
              onClick={() => setActiveTab("tournament")}
              className={`flex-1 font-medium py-2.5 px-4 rounded-lg transition-all duration-200 text-sm ${
                activeTab === "tournament"
                  ? "bg-purple-600 text-white"
                  : "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
              }`}
            >
              Tournament History
            </button> */}
          </div>

          {/* Tab Content */}
          {activeTab === "wallet" && (
            <div className="space-y-4">
              {/* Wallet History Header */}
              <div className="flex justify-between items-center">
                <h3 
                  className="text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  Recent Transactions
                </h3>
                <button
                  onClick={handleRefreshWallet}
                  disabled={walletRefreshing}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${walletRefreshing ? "animate-spin" : ""}`}
                    style={{ color: "var(--text-secondary)" }}
                  />
                </button>
              </div>

              {/* Loading State */}
              {walletLoading && (
                <div className="text-center py-8">
                  <div className="inline-block w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Loading wallet history...
                  </p>
                </div>
              )}

              {/* Error State */}
              {walletError && !walletLoading && (
                <div className="text-center py-8">
                  <p className="text-sm text-red-500 mb-2">{walletError}</p>
                  <button
                    onClick={() => fetchWalletHistory(true)}
                    className="text-sm text-purple-600 hover:text-purple-700 underline"
                  >
                    Try again
                  </button>
                </div>
              )}

              {/* Empty State */}
              {!walletLoading && !walletError && walletHistory.length === 0 && (
                <div className="text-center py-8">
                  <p style={{ color: "var(--text-secondary)" }} className="text-sm">
                    No transactions yet
                  </p>
                </div>
              )}

              {/* Transaction List */}
              {!walletLoading && !walletError && walletHistory.length > 0 && (
                <div className="space-y-3">
                  {walletHistory.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex justify-between items-center py-3 px-4 rounded-lg border border-gray-200 dark:border-gray-700"
                      style={{ backgroundColor: "var(--bg-secondary)" }}
                    >
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className="text-sm font-medium"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {transaction.title}
                          </span>
                          <span
                            className={`text-sm font-bold ${
                              transaction.type === "credit"
                                ? "text-green-500"
                                : "text-red-500"
                            }`}
                          >
                            {transaction.type === "credit" ? "+" : "-"}₹
                            {transaction.amount.toFixed(2)}
                          </span>
                        </div>
                        
                        {transaction.description && (
                          <p
                            className="text-xs mb-1"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {transaction.description}
                          </p>
                        )}
                        
                        <div className="flex justify-between items-center text-xs">
                          <span style={{ color: "var(--text-secondary)" }}>
                            {transaction.date}
                          </span>
                          {transaction.balanceAfter !== undefined && (
                            <span style={{ color: "var(--text-secondary)" }}>
                              Balance: ₹{transaction.balanceAfter.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Load More Button */}
                  {hasMore && (
                    <div className="text-center pt-4">
                      <button
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors disabled:opacity-50"
                      >
                        {loadingMore ? (
                          <>
                            <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                            Loading more...
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            Load more transactions
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {!hasMore && walletHistory.length > 0 && (
                    <div className="text-center pt-4">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        You've reached the end of your transaction history
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "tournament" && (
            <div className="space-y-3">
              {tournamentHistory.map((tournament) => (
                <div
                  key={tournament.id}
                  className="flex justify-between items-center py-3 px-4 rounded-lg border border-gray-200 dark:border-gray-700"
                  style={{ backgroundColor: "var(--bg-secondary)" }}
                >
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span 
                        className="text-sm font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {tournament.name}
                      </span>
                      <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                        {tournament.result}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span style={{ color: "var(--text-secondary)" }}>
                        {tournament.date}
                      </span>
                      <span className="text-green-500 font-medium">
                        {tournament.prize}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}