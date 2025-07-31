"use client";

import { Download, AlertCircle, Wallet, History, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

// Import the separate components
import AccessModal from "./AccessModal";
import Step1SlotlistComponent from "./Step1SlotlistComponent";
import Step2MatchResultComponent from "./Step2MatchResultComponent";
import Step3CombineResultComponent from "./Step3CombineResultComponent";
import MatchHistory from "./MatchHistory";

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
    result: false,
    combine: false,
  });
  const [processingPayment, setProcessingPayment] = useState(false);
  const [processing, setProcessing] = useState({
    slotlist: false,
    result: false,
    combine: false,
  });
  const [uploadProgress, setUploadProgress] = useState({
    slotlist: { current: 0, total: 0, status: "" },
    result: { current: 0, total: 0, status: "" },
    combine: { current: 0, total: 0, status: "" },
  });
  const [downloadLinks, setDownloadLinks] = useState({
    result: null,
    combine: null,
  });

  // State for showing/hiding match history
  const [showMatchHistory, setShowMatchHistory] = useState(false);

  // State for JSON data instead of CSV
  const [slotlistJsonData, setSlotlistJsonData] = useState({
    hasData: false,
    jsonData: null,
    teamCount: 0,
    playerCount: 0,
  });

  // State for previous match data (for combine feature)
  const [prevMatchData, setPrevMatchData] = useState({
    hasData: false,
    csvData: null,
    teamCount: 0,
    source: "", // "csv" or "matchId"
    matchId: "",
  });

  // Check if all features are used
  const allFeaturesUsed =
    buttonsLocked.slotlist && buttonsLocked.result && buttonsLocked.combine;

  // File size validation helper
  const validateFileSize = (file, maxSizeMB = 10) => {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  };

  // Upload to Cloudinary helper
  const uploadToCloudinary = async (file, folder = "ranger-modal") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append(
      "upload_preset",
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "ranger_uploads"
    );
    formData.append("folder", folder);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Cloudinary upload failed");
      }

      const data = await response.json();
      return {
        url: data.secure_url,
        publicId: data.public_id,
        format: data.format,
        size: data.bytes,
      };
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      throw new Error("Failed to upload image to cloud storage");
    }
  };

  // Batch upload with progress tracking
  const uploadMultipleToCloudinary = async (
    files,
    folder,
    progressCallback
  ) => {
    const uploadPromises = Array.from(files).map(async (file, index) => {
      try {
        // Validate file size (max 10MB for individual files)
        if (!validateFileSize(file, 10)) {
          throw new Error(
            `File ${file.name} is too large. Maximum size is 10MB.`
          );
        }

        progressCallback({
          current: index,
          total: files.length,
          status: `Uploading ${file.name}...`,
        });

        const result = await uploadToCloudinary(file, folder);

        progressCallback({
          current: index + 1,
          total: files.length,
          status: `Uploaded ${file.name}`,
        });

        return result;
      } catch (error) {
        progressCallback({
          current: index + 1,
          total: files.length,
          status: `Failed: ${file.name} - ${error.message}`,
        });
        throw error;
      }
    });

    return Promise.all(uploadPromises);
  };

  // Fetch wallet balance on component mount
  useEffect(() => {
    const fetchWalletBalance = async () => {
      if (status === "loading") return;

      if (!session) {
        router.push("/auth/signin");
        return;
      }

      try {
        const response = await fetch("/api/wallet");
        if (response.ok) {
          const data = await response.json();
          setWalletBalance(data.wallet.balance);
          setHasAccess(data.wallet.balance >= 3);
        } else {
          console.error("Failed to fetch wallet balance");
          setHasAccess(false);
        }
      } catch (error) {
        console.error("Error fetching wallet balance:", error);
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
      const response = await fetch("/api/wallet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: 3,
          type: "debit",
          title: "Ranger Modal Access",
          description: "Access fee for Ranger Modal features",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setWalletBalance(data.wallet.balance);
        setAccessGranted(true);
        setShowAccessModal(false);

        // Show success message
        alert(
          "Payment successful! You now have access to Ranger Modal features."
        );
      } else {
        const errorData = await response.json();
        alert(`Payment failed: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Payment error:", error);
      alert("Payment failed. Please try again.");
    } finally {
      setProcessingPayment(false);
    }
  };

  const processCombinedSlotlist = async () => {
    if (!accessGranted || buttonsLocked.slotlist) return;

    const slotlistPoster = document.getElementById("slotlist-poster").files[0];
    const slotScreenshots = document.getElementById(
      "slot-upload-combined"
    ).files;

    if (!slotlistPoster || slotScreenshots.length === 0) {
      alert("Please upload both slotlist poster and slot screenshots");
      return;
    }

    setProcessing((prev) => ({ ...prev, slotlist: true }));

    try {
      // Upload slotlist poster to Cloudinary
      setUploadProgress((prev) => ({
        ...prev,
        slotlist: {
          current: 0,
          total: slotScreenshots.length + 1,
          status: "Uploading slotlist poster...",
        },
      }));

      const posterUpload = await uploadToCloudinary(
        slotlistPoster,
        "ranger-modal/slotlist"
      );

      // Upload screenshots to Cloudinary with progress tracking
      const screenshotUploads = await uploadMultipleToCloudinary(
        slotScreenshots,
        "ranger-modal/screenshots",
        (progress) =>
          setUploadProgress((prev) => ({
            ...prev,
            slotlist: {
              current: progress.current + 1,
              total: slotScreenshots.length + 1,
              status: progress.status,
            },
          }))
      );

      // Process with Cloudinary URLs
      setUploadProgress((prev) => ({
        ...prev,
        slotlist: {
          current: slotScreenshots.length + 1,
          total: slotScreenshots.length + 1,
          status: "Processing with AI...",
        },
      }));

      const response = await fetch("/api/ranger/slotlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slotlistPosterUrl: posterUpload.url,
          slotScreenshotUrls: screenshotUploads.map((upload) => upload.url),
          useCloudinary: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Store JSON data directly instead of CSV
        setSlotlistJsonData({
          hasData: true,
          jsonData: data.extractedData,
          teamCount: data.teamNames.length,
          playerCount: data.playerCount,
        });

        setButtonsLocked((prev) => ({ ...prev, slotlist: true }));

        alert(
          `Slotlist data generated successfully! Found ${data.playerCount} players across ${data.teamNames.length} teams.\n\nThe data has been automatically loaded into Step 2.`
        );
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error processing slotlist:", error);
      alert(`Failed to process slotlist: ${error.message}`);
    } finally {
      setProcessing((prev) => ({ ...prev, slotlist: false }));
      setUploadProgress((prev) => ({
        ...prev,
        slotlist: { current: 0, total: 0, status: "" },
      }));
    }
  };

  const processResultScreenshots = async () => {
    if (!accessGranted || buttonsLocked.result) return;

    const resultScreenshots = document.getElementById("result-upload").files;
    const matchesPlayed = document.getElementById("matches-played").value;
    const groupName = document.getElementById("group-name").value;
    const matchId = document.getElementById("match-id").value;

    // Check if we have JSON data from Step 1
    if (!slotlistJsonData.hasData) {
      alert("Please generate slotlist data from Step 1 first");
      return;
    }

    if (resultScreenshots.length === 0) {
      alert("Please upload result screenshots");
      return;
    }

    if (!matchId.trim()) {
      alert("Please enter a Match ID");
      return;
    }

    setProcessing((prev) => ({ ...prev, result: true }));

    try {
      // Upload result screenshots to Cloudinary
      const resultUploads = await uploadMultipleToCloudinary(
        resultScreenshots,
        "ranger-modal/results",
        (progress) =>
          setUploadProgress((prev) => ({
            ...prev,
            result: {
              current: progress.current,
              total: resultScreenshots.length,
              status: progress.status,
            },
          }))
      );

      // Process with Cloudinary URLs
      setUploadProgress((prev) => ({
        ...prev,
        result: {
          current: resultScreenshots.length,
          total: resultScreenshots.length,
          status: "Processing with AI...",
        },
      }));

      const response = await fetch("/api/ranger/match-results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slotlistJsonData: slotlistJsonData.jsonData,
          matchesPlayed: matchesPlayed,
          groupName: groupName,
          matchId: matchId,
          resultScreenshotUrls: resultUploads.map((upload) => upload.url),
          useCloudinary: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Upload CSV to Cloudinary and store in MongoDB
        setUploadProgress((prev) => ({
          ...prev,
          result: {
            current: resultScreenshots.length,
            total: resultScreenshots.length,
            status: "Uploading CSV and storing data...",
          },
        }));

        try {
          const csvUploadResponse = await fetch(
            "/api/ranger/match-csv-uploader",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                matchId: matchId.trim(),
                groupName: groupName,
                matchesPlayed: matchesPlayed,
                csvData: data.csvData,
                processedResults: data.processedResults,
                summary: data.summary,
                unidentifiedTeams: data.unidentifiedTeams,
                imageProcessingErrors: data.imageProcessingErrors,
                slotlistJsonData: slotlistJsonData.jsonData,
                resultScreenshotUrls: resultUploads.map((upload) => upload.url),
              }),
            }
          );

          if (csvUploadResponse.ok) {
            const csvUploadData = await csvUploadResponse.json();
            console.log(
              "CSV uploaded and match data stored successfully:",
              csvUploadData
            );

            // Create downloadable CSV file from the Cloudinary URL
            const csvUrl = csvUploadData.csvUrl;

            setDownloadLinks((prev) => ({ ...prev, result: csvUrl }));
            setButtonsLocked((prev) => ({ ...prev, result: true }));

            alert(`Match results processed and stored successfully! 
          
Match ID: ${matchId}
Processed: ${data.summary.totalMatches} matches for group ${data.summary.groupName}
CSV uploaded to cloud storage
Stored in database with ID: ${csvUploadData.matchResult.id}

You can view this match in your Match History below.`);
          } else {
            const csvUploadError = await csvUploadResponse.json();
            console.error(
              "Failed to upload CSV and store match data:",
              csvUploadError
            );

            // Still provide local CSV download as fallback
            const blob = new Blob([data.csvData], { type: "text/csv" });
            const url = URL.createObjectURL(blob);

            setDownloadLinks((prev) => ({ ...prev, result: url }));
            setButtonsLocked((prev) => ({ ...prev, result: true }));

            if (csvUploadResponse.status === 409) {
              alert(`Match results processed successfully but storage failed: ${csvUploadError.error}
            
Local CSV file is still available for download.`);
            } else {
              alert(`Match results processed successfully but failed to upload CSV and store in database: ${csvUploadError.error}
            
Local CSV file is still available for download.`);
            }
          }
        } catch (csvUploadError) {
          console.error(
            "Error uploading CSV and storing match data:",
            csvUploadError
          );

          // Still provide local CSV download
          const blob = new Blob([data.csvData], { type: "text/csv" });
          const url = URL.createObjectURL(blob);

          setDownloadLinks((prev) => ({ ...prev, result: url }));
          setButtonsLocked((prev) => ({ ...prev, result: true }));

          alert(`Match results processed successfully but failed to upload CSV and store in database.
        
Local CSV file is still available for download.`);
        }
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error processing match results:", error);
      alert(`Failed to process match results: ${error.message}`);
    } finally {
      setProcessing((prev) => ({ ...prev, result: false }));
      setUploadProgress((prev) => ({
        ...prev,
        result: { current: 0, total: 0, status: "" },
      }));
    }
  };

  // Reset access function
  const resetAccess = () => {
    setAccessGranted(false);
    setButtonsLocked({ slotlist: false, result: false, combine: false });
    setDownloadLinks({ result: null, combine: null });
    setSlotlistJsonData({
      hasData: false,
      jsonData: null,
      teamCount: 0,
      playerCount: 0,
    });
    setPrevMatchData({
      hasData: false,
      csvData: null,
      teamCount: 0,
      source: "",
      matchId: "",
    });
    setUploadProgress({
      slotlist: { current: 0, total: 0, status: "" },
      result: { current: 0, total: 0, status: "" },
      combine: { current: 0, total: 0, status: "" },
    });
    setShowAccessModal(true);
  };

  // Loading state
  if (loading) {
    return (
      <div className="mx-auto px-4 sm:px-6 pt-10 md:pt-0 flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div
            className="inline-block animate-spin rounded-full h-8 w-8 border-b-2"
            style={{ borderColor: "var(--purple-primary)" }}
          ></div>
          <div
            className="mt-2 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Loading wallet information...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto px-4 sm:px-6 pt-10 md:pt-0">
      {/* Access Confirmation Modal */}
      <AccessModal
        showAccessModal={showAccessModal}
        setShowAccessModal={setShowAccessModal}
        walletBalance={walletBalance}
        processingPayment={processingPayment}
        handleAccessPayment={handleAccessPayment}
        onCancel={() => {
          setShowAccessModal(false);
          router.push("/");
        }}
      />

      <div className="max-h-screen overflow-hidden">
        {/* Header */}
        <div className="py-4">
          <div className="flex items-center justify-between">
            <h2
              className="text-xl font-bold"
              style={{
                backgroundColor: "var(--bg-primary)",
                color: "var(--text-primary)",
              }}
            >
              Ranger Modal
            </h2>
          </div>
          <div>
            <div className="flex justify-between items-center mt-4 ">
              {/* Wallet Balance Display */}
              <div className="mt-2 flex items-center space-x-2">
                <Wallet
                  className="w-4 h-4"
                  style={{ color: "var(--text-secondary)" }}
                />
                <span
                  className="text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Wallet Balance:{" "}
                  <span
                    className="font-semibold"
                    style={{
                      color: walletBalance >= 3 ? "#16a34a" : "#dc2626",
                    }}
                  >
                    ₹{walletBalance?.toFixed(2) || "0.00"}
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
                    className={`text-sm px-3 py-1 ml-2 ${
                      allFeaturesUsed
                        ? "bg-red-500 hover:bg-red-600"
                        : "bg-purple-500 hover:bg-purple-600"
                    } text-white rounded transition-colors cursor-pointer`}
                    animate={
                      allFeaturesUsed
                        ? {
                            scale: [1, 1.1, 1],
                            boxShadow: [
                              "0 0 0 0px rgba(239, 68, 68, 0.7)",
                              "0 0 0 10px rgba(239, 68, 68, 0)",
                              "0 0 0 0px rgba(239, 68, 68, 0)",
                            ],
                          }
                        : {}
                    }
                    transition={
                      allFeaturesUsed
                        ? {
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }
                        : {}
                    }
                  >
                    {allFeaturesUsed ? (
                      <motion.span
                        animate={{
                          color: ["#ffffff", "#ffff00", "#ffffff"],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        Reset Access
                      </motion.span>
                    ) : (
                      "Reset Access"
                    )}
                  </motion.button>
                )}
              </div>

              {/* Match History Toggle Button */}
              <button
                onClick={() => setShowMatchHistory(!showMatchHistory)}
                className="flex items-center space-x-2  px-4 py-1 cursor-pointer rounded-lg border transition-colors"
                style={{
                  borderColor: "var(--border-color)",
                  backgroundColor: showMatchHistory
                    ? "var(--purple-primary)"
                    : "var(--bg-card)",
                  color: showMatchHistory ? "white" : "var(--text-primary)",
                }}
              >
                {showMatchHistory ? (
                  <>
                    <X className="w-4 h-4" />
                    <span>Hide History</span>
                  </>
                ) : (
                  <>
                    <History className="w-5 h-5" />
                    <span>Match History</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Access Restriction Notice */}
      {!hasAccess && (
        <div
          className="card rounded-lg p-4 sm:p-6 shadow-sm border mb-6"
          style={{ backgroundColor: "#fef2f2", borderColor: "#fecaca" }}
        >
          <div className="flex items-center mb-3">
            <AlertCircle
              className="w-5 h-5 mr-2"
              style={{ color: "#dc2626" }}
            />
            <h3 className="text-lg font-semibold" style={{ color: "#dc2626" }}>
              Insufficient Wallet Balance
            </h3>
          </div>
          <p className="text-sm mb-4" style={{ color: "#991b1b" }}>
            You need at least ₹3.00 in your wallet to access the Ranger Modal
            features. Your current balance is ₹
            {walletBalance?.toFixed(2) || "0.00"}.
          </p>
          <button
            className="font-medium py-2 px-4 rounded-lg transition-all duration-200 text-sm"
            style={{
              backgroundColor: "#dc2626",
              color: "#ffffff",
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#b91c1c")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "#dc2626")}
            onClick={() => router.push("/wallet")}
          >
            Add Money to Wallet
          </button>
        </div>
      )}

      {/* Conditional Rendering: Show Match History OR Ranger Modal Steps */}
      <AnimatePresence mode="wait">
        {showMatchHistory ? (
          <motion.div
            key="match-history"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <MatchHistory />
          </motion.div>
        ) : (
          <motion.div
            key="ranger-steps"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Step 1: Combined Slotlist */}
            <Step1SlotlistComponent
              accessGranted={accessGranted}
              buttonsLocked={buttonsLocked}
              processing={processing}
              uploadProgress={uploadProgress}
              processCombinedSlotlist={processCombinedSlotlist}
            />
            
            {/* Step 2: Match Result */}
            <Step2MatchResultComponent
              accessGranted={accessGranted}
              buttonsLocked={buttonsLocked}
              processing={processing}
              uploadProgress={uploadProgress}
              slotlistJsonData={slotlistJsonData}
              processResultScreenshots={processResultScreenshots}
            />

            {/* Step 3: Combine Results */}
            <Step3CombineResultComponent
              accessGranted={accessGranted}
              buttonsLocked={buttonsLocked}
              processing={processing}
              uploadProgress={uploadProgress}
              prevMatchData={prevMatchData}
              setPrevMatchData={setPrevMatchData}
              validateFileSize={validateFileSize}
              uploadMultipleToCloudinary={uploadMultipleToCloudinary}
              setUploadProgress={setUploadProgress}
              setProcessing={setProcessing}
              setButtonsLocked={setButtonsLocked}
              setDownloadLinks={setDownloadLinks}
            />

            {/* Download Section */}
            {(downloadLinks.result || downloadLinks.combine) && (
              <div className="card rounded-lg p-4 sm:p-6 shadow-sm border">
                <div className="flex items-center mb-4">
                  <h2
                    className="text-lg sm:text-xl font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Download Your Files
                  </h2>
                  <Download
                    className="ml-auto w-5 h-5"
                    style={{ color: "var(--text-secondary)" }}
                  />
                </div>

                <div className="space-y-3">
                  {/* Regular Match Results Download */}
                  {downloadLinks.result && (
                    <div>
                      <p
                        className="text-sm font-medium mb-2"
                        style={{ color: "var(--text-primary)" }}
                      >
                        Match Results CSV
                      </p>
                      {downloadLinks.result.startsWith("blob:") ? (
                        // Local blob URL - direct download
                        <a
                          href={downloadLinks.result}
                          download="match_results.csv"
                          className="block w-full font-medium py-2.5 px-4 rounded-lg transition-all duration-200 text-center text-sm hover:transform hover:-translate-y-0.5"
                          style={{
                            backgroundColor: "#2563eb",
                            color: "#ffffff",
                          }}
                          onMouseEnter={(e) =>
                            (e.target.style.backgroundColor = "#1d4ed8")
                          }
                          onMouseLeave={(e) =>
                            (e.target.style.backgroundColor = "#2563eb")
                          }
                        >
                          Download Match Result CSV (Local)
                        </a>
                      ) : (
                        // Cloudinary URL - open in new tab
                        <a
                          href={downloadLinks.result}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full font-medium py-2.5 px-4 rounded-lg transition-all duration-200 text-center text-sm hover:transform hover:-translate-y-0.5"
                          style={{
                            backgroundColor: "#16a34a",
                            color: "#ffffff",
                          }}
                          onMouseEnter={(e) =>
                            (e.target.style.backgroundColor = "#15803d")
                          }
                          onMouseLeave={(e) =>
                            (e.target.style.backgroundColor = "#16a34a")
                          }
                        >
                          Download Match Result CSV (Cloud)
                        </a>
                      )}
                    </div>
                  )}

                  {/* Combined Results Download */}
                  {downloadLinks.combine && (
                    <div>
                      <p
                        className="text-sm font-medium mb-2"
                        style={{ color: "var(--text-primary)" }}
                      >
                        Combined Results CSV
                      </p>
                      <a
                        href={downloadLinks.combine}
                        download="combined_match_results.csv"
                        className="block w-full font-medium py-2.5 px-4 rounded-lg transition-all duration-200 text-center text-sm hover:transform hover:-translate-y-0.5"
                        style={{
                          backgroundColor: "#7c3aed",
                          color: "#ffffff",
                        }}
                        onMouseEnter={(e) =>
                          (e.target.style.backgroundColor = "#6d28d9")
                        }
                        onMouseLeave={(e) =>
                          (e.target.style.backgroundColor = "#7c3aed")
                        }
                      >
                        Download Combined Result CSV
                      </a>
                      <p
                        className="text-xs mt-1"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Combined results from previous match data and new match
                        results
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}