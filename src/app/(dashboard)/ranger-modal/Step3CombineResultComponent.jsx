"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function Step3CombineResultComponent({
  accessGranted,
  buttonsLocked,
  processing,
  uploadProgress,
  prevMatchData,
  setPrevMatchData,
  processCombineResults,
  validateFileSize,
  uploadMultipleToCloudinary,
  setUploadProgress,
  setProcessing,
  setButtonsLocked,
  setDownloadLinks,
}) {
  // Function to fetch previous match data by Match ID
  const fetchPrevMatchData = async () => {
    const prevMatchId = document.getElementById("prev-match-id").value.trim();

    if (!prevMatchId) {
      alert("Please enter a Match ID");
      return;
    }

    console.log("Fetching match data for ID:", prevMatchId);

    try {
      const url = `/api/ranger/take-csv?matchId=${encodeURIComponent(
        prevMatchId
      )}`;
      console.log("Request URL:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

      // Always try to parse as JSON, but handle cases where it might fail
      let data;
      try {
        data = await response.json();
        console.log("Response data:", data);
      } catch (parseError) {
        console.error("Failed to parse response as JSON:", parseError);
        const textResponse = await response.text();
        console.log("Raw response:", textResponse);
        alert(
          `Server returned invalid JSON response. Status: ${response.status}`
        );
        return;
      }

      if (response.ok && data && data.success) {
        // Check if we actually have CSV data
        if (!data.csvData) {
          alert("No CSV data found in the response");
          return;
        }

        setPrevMatchData({
          hasData: true,
          csvData: data.csvData,
          teamCount: data.csvData ? data.csvData.split("\n").length - 1 : 0,
          source: "matchId",
          matchId: prevMatchId,
          matchInfo: data.matchInfo, // Store additional match info
        });

        const teamCount = data.csvData.split("\n").length - 1;
        alert(
          `Previous match data loaded successfully!
        
Match ID: ${data.matchInfo?.matchId || prevMatchId}
Group: ${data.matchInfo?.groupName || 'N/A'}
Teams Found: ${teamCount}
Winner: ${data.matchInfo?.winner || "N/A"}
Created: ${data.matchInfo?.createdAt ? new Date(data.matchInfo.createdAt).toLocaleDateString() : 'N/A'}`
        );
      } else {
        // Handle error responses - ensure data exists before logging
        if (data) {
          console.error("Error response:", data);
        } else {
          console.error("No response data received");
        }

        let errorMessage = "Unknown error occurred";

        if (data && typeof data === "object") {
          errorMessage =
            data.error || data.message || "Failed to fetch match data";

          // Show debug info if available
          if (data.debug) {
            console.log("Debug info:", data.debug);
          }
        } else if (typeof data === "string") {
          errorMessage = data;
        } else if (!response.ok) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }

        alert(`Failed to fetch match data: ${errorMessage}`);
      }
    } catch (error) {
      console.error("Network or other error:", error);
      alert(
        `Failed to fetch previous match data: ${error.message}. Please try again.`
      );
    }
  };

  // Function to handle CSV file upload
  const handlePrevMatchCsvUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      alert("Please upload a CSV file");
      return;
    }

    if (!validateFileSize(file, 10)) {
      alert("File size must be less than 10MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvContent = e.target.result;
      const lines = csvContent.split("\n").filter((line) => line.trim());

      setPrevMatchData({
        hasData: true,
        csvData: csvContent,
        teamCount: lines.length - 1, // Subtract header
        source: "csv",
        matchId: "uploaded-csv",
      });

      alert(`CSV uploaded successfully! Found ${lines.length - 1} teams.`);
    };

    reader.onerror = () => {
      alert("Failed to read CSV file");
    };

    reader.readAsText(file);
  };

  // Main function to process combined results
  const handleProcessCombineResults = async () => {
    if (!accessGranted || buttonsLocked.combine) return;

    const newResultScreenshots = document.getElementById(
      "combine-result-upload"
    ).files;
    const combineMatchesPlayed = document.getElementById(
      "combine-matches-played"
    ).value;
    const combineGroupName =
      document.getElementById("combine-group-name").value;
    const combineMatchId = document.getElementById("combine-match-id").value;
    const prevMatchCsv = document.getElementById("prev-match-csv").files[0];

    // Check if we have previous match data (either from CSV upload or Match ID fetch)
    if (!prevMatchData.hasData && !prevMatchCsv) {
      alert("Please either upload a CSV file or fetch data using Match ID");
      return;
    }

    if (newResultScreenshots.length === 0) {
      alert("Please upload new match result screenshots");
      return;
    }

    if (!combineMatchId.trim()) {
      alert("Please enter a new Match ID for the combined result");
      return;
    }

    // Handle CSV upload if provided
    if (prevMatchCsv && !prevMatchData.hasData) {
      await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const csvContent = e.target.result;
          const lines = csvContent.split("\n").filter((line) => line.trim());

          setPrevMatchData({
            hasData: true,
            csvData: csvContent,
            teamCount: lines.length - 1,
            source: "csv",
            matchId: "uploaded-csv",
          });
          resolve();
        };
        reader.readAsText(prevMatchCsv);
      });
    }

    setProcessing((prev) => ({ ...prev, combine: true }));

    try {
      // Upload new result screenshots to Cloudinary
      const resultUploads = await uploadMultipleToCloudinary(
        newResultScreenshots,
        "ranger-modal/combine-results",
        (progress) =>
          setUploadProgress((prev) => ({
            ...prev,
            combine: {
              current: progress.current,
              total: newResultScreenshots.length,
              status: progress.status,
            },
          }))
      );

      // Process combined results
      setUploadProgress((prev) => ({
        ...prev,
        combine: {
          current: newResultScreenshots.length,
          total: newResultScreenshots.length,
          status: "Processing combined results with AI...",
        },
      }));

      const response = await fetch("/api/ranger/combine-results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prevMatchCsvData: prevMatchData.csvData,
          newResultScreenshotUrls: resultUploads.map((upload) => upload.url),
          combineMatchesPlayed: combineMatchesPlayed,
          combineGroupName: combineGroupName,
          combineMatchId: combineMatchId,
          useCloudinary: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Upload combined CSV to Cloudinary and store in MongoDB
        setUploadProgress((prev) => ({
          ...prev,
          combine: {
            current: newResultScreenshots.length,
            total: newResultScreenshots.length,
            status: "Uploading combined CSV and storing data...",
          },
        }));

        try {
          const csvUploadResponse = await fetch("/api/ranger/process-json", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              matchId: combineMatchId.trim(),
              groupName: combineGroupName,
              matchesPlayed: combineMatchesPlayed,
              csvData: data.csvData,
              processedResults: data.processedResults,
              summary: data.summary,
              unidentifiedTeams: data.unidentifiedTeams,
              imageProcessingErrors: data.imageProcessingErrors,
              slotlistJsonData: data.combinedTeamsData,
              resultScreenshotUrls: resultUploads.map((upload) => upload.url),
              isCombinedResult: true,
              previousMatchId: prevMatchData.matchId,
            }),
          });

          if (csvUploadResponse.ok) {
            const csvUploadData = await csvUploadResponse.json();

            // Create downloadable CSV file
            const blob = new Blob([data.csvData], { type: "text/csv" });
            const url = URL.createObjectURL(blob);

            setDownloadLinks((prev) => ({ ...prev, combine: url }));
            setButtonsLocked((prev) => ({ ...prev, combine: true }));

            alert(`Combined results processed and stored successfully! 
          
Combined Match ID: ${combineMatchId}
Previous Match Teams: ${data.summary?.previousTeamsCount || 'N/A'}
New Match Results: ${data.summary?.newResultsCount || 'N/A'}
Total Combined Teams: ${data.summary?.totalCombinedTeams || 'N/A'}
Winner: ${data.summary?.winner || 'N/A'}

You can view this combined match in your Match History.`);
          } else {
            const csvUploadError = await csvUploadResponse.json();

            // Still provide local CSV download as fallback
            const blob = new Blob([data.csvData], { type: "text/csv" });
            const url = URL.createObjectURL(blob);

            setDownloadLinks((prev) => ({ ...prev, combine: url }));
            setButtonsLocked((prev) => ({ ...prev, combine: true }));

            alert(`Combined results processed successfully but storage failed: ${csvUploadError.error || 'Unknown error'}
          
Local CSV file is available for download.`);
          }
        } catch (csvUploadError) {
          console.error("Error uploading combined CSV:", csvUploadError);

          // Still provide local CSV download
          const blob = new Blob([data.csvData], { type: "text/csv" });
          const url = URL.createObjectURL(blob);

          setDownloadLinks((prev) => ({ ...prev, combine: url }));
          setButtonsLocked((prev) => ({ ...prev, combine: true }));

          alert(
            "Combined results processed successfully but failed to store in database. Local CSV file is available for download."
          );
        }
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || 'Unknown error occurred'}`);
      }
    } catch (error) {
      console.error("Error processing combined results:", error);
      alert(`Failed to process combined results: ${error.message}`);
    } finally {
      setProcessing((prev) => ({ ...prev, combine: false }));
      setUploadProgress((prev) => ({
        ...prev,
        combine: { current: 0, total: 0, status: "" },
      }));
    }
  };

  // Add event listener for CSV upload
  useEffect(() => {
    const csvInput = document.getElementById("prev-match-csv");
    if (csvInput) {
      csvInput.addEventListener("change", handlePrevMatchCsvUpload);
      return () => {
        csvInput.removeEventListener("change", handlePrevMatchCsvUpload);
      };
    }
  }, []);

  // Progress indicator component
  const ProgressIndicator = ({ progress, type }) => {
    if (progress?.total === 0) return null;

    const percentage = (progress?.current / progress.total) * 100;

    return (
      <div className="mt-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
            Processing Combined Results
          </span>
          <span className="text-sm text-purple-600 dark:text-purple-300">
            {progress?.current}/{progress.total}
          </span>
        </div>
        <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-2 mb-2">
          <div
            className="bg-purple-600 dark:bg-purple-400 h-2 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="text-xs text-purple-700 dark:text-purple-300">
          {progress.status}
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div
        className="card rounded-lg p-4 sm:p-6 shadow-sm border"
        style={{
          backgroundColor: "var(--bg-card)",
          borderColor: "var(--border-color)",
        }}
      >
        <div className="flex items-center mb-4">
          <h2
            className="text-lg sm:text-xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Step 3: Combine Results
          </h2>
          <div className="ml-auto flex items-center space-x-2">
            {processing.combine && (
              <div
                className="inline-block animate-spin rounded-full h-4 w-4 border-b-2"
                style={{ borderColor: "var(--purple-primary)" }}
              ></div>
            )}
          </div>
        </div>

        {!accessGranted && (
          <div
            className="mb-4 p-3 rounded-lg border"
            style={{ backgroundColor: "#fef2f2", borderColor: "#fecaca" }}
          >
            <p className="text-sm" style={{ color: "#991b1b" }}>
              Access required to use Combine Result feature
            </p>
          </div>
        )}

        <div className="space-y-4">
          {/* Previous Match Data Input */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              Previous Match Data
            </label>
            <div className="space-y-3">
              {/* CSV Upload Option */}
              <div>
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Upload CSV File
                </label>
                <input
                  type="file"
                  id="prev-match-csv"
                  accept=".csv"
                  disabled={
                    !accessGranted ||
                    processing.combine ||
                    buttonsLocked.combine
                  }
                  className="block w-full text-sm border rounded-lg p-2"
                  style={{
                    backgroundColor: "var(--bg-secondary)",
                    borderColor: "var(--border-color)",
                    color: "var(--text-primary)",
                    opacity:
                      !accessGranted ||
                      processing.combine ||
                      buttonsLocked.combine
                        ? 0.5
                        : 1,
                  }}
                />
                <p
                  className="text-xs mt-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Upload previous match CSV data (max 10MB)
                </p>
              </div>

              {/* OR Divider */}
              <div className="flex items-center">
                <div
                  className="flex-1 border-t"
                  style={{ borderColor: "var(--border-color)" }}
                ></div>
                <span
                  className="px-3 text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  OR
                </span>
                <div
                  className="flex-1 border-t"
                  style={{ borderColor: "var(--border-color)" }}
                ></div>
              </div>

              {/* Match ID Retrieval Option */}
              <div>
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Retrieve from Match ID
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    id="prev-match-id"
                    placeholder="Enter previous Match ID"
                    disabled={
                      !accessGranted ||
                      processing.combine ||
                      buttonsLocked.combine
                    }
                    className="flex-1 text-sm border rounded-lg p-2"
                    style={{
                      backgroundColor: "var(--bg-secondary)",
                      borderColor: "var(--border-color)",
                      color: "var(--text-primary)",
                      opacity:
                        !accessGranted ||
                        processing.combine ||
                        buttonsLocked.combine
                          ? 0.5
                          : 1,
                    }}
                  />
                  <button
                    onClick={fetchPrevMatchData}
                    disabled={
                      !accessGranted ||
                      processing.combine ||
                      buttonsLocked.combine
                    }
                    className="px-3 py-2 text-sm rounded-lg border transition-colors"
                    style={{
                      backgroundColor: "var(--purple-primary)",
                      borderColor: "var(--purple-primary)",
                      color: "white",
                      opacity:
                        !accessGranted ||
                        processing.combine ||
                        buttonsLocked.combine
                          ? 0.5
                          : 1,
                    }}
                  >
                    Fetch
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Match Configuration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                Matches Played
              </label>
              <input
                type="number"
                id="combine-matches-played"
                defaultValue="2"
                min="1"
                max="10"
                disabled={
                  !accessGranted || processing.combine || buttonsLocked.combine
                }
                className="w-full text-sm border rounded-lg p-2"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border-color)",
                  color: "var(--text-primary)",
                  opacity:
                    !accessGranted ||
                    processing.combine ||
                    buttonsLocked.combine
                      ? 0.5
                      : 1,
                }}
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                Group Name
              </label>
              <input
                type="text"
                id="combine-group-name"
                defaultValue="G2"
                disabled={
                  !accessGranted || processing.combine || buttonsLocked.combine
                }
                className="w-full text-sm border rounded-lg p-2"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border-color)",
                  color: "var(--text-primary)",
                  opacity:
                    !accessGranted ||
                    processing.combine ||
                    buttonsLocked.combine
                      ? 0.5
                      : 1,
                }}
              />
            </div>
          </div>

          {/* New Match ID */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              New Combined Match ID
            </label>
            <input
              type="text"
              id="combine-match-id"
              placeholder="Enter new Match ID for combined result"
              disabled={
                !accessGranted || processing.combine || buttonsLocked.combine
              }
              className="w-full text-sm border rounded-lg p-2"
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border-color)",
                color: "var(--text-primary)",
                opacity:
                  !accessGranted || processing.combine || buttonsLocked.combine
                    ? 0.5
                    : 1,
              }}
            />
          </div>

          {/* New Match Result Screenshots */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              Upload New Match Result Screenshot(s)
            </label>
            <input
              type="file"
              id="combine-result-upload"
              multiple
              accept="image/*,.png,.jpg,.jpeg,.webp"
              disabled={
                !accessGranted || processing.combine || buttonsLocked.combine
              }
              className="block w-full text-sm border border-dashed rounded-lg p-4"
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border-color)",
                color: "var(--text-primary)",
                opacity:
                  !accessGranted || processing.combine || buttonsLocked.combine
                    ? 0.5
                    : 1,
              }}
            />
            <p
              className="text-xs mt-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Upload new match result screenshots (Max 10MB each, multiple files
              supported)
            </p>
          </div>

          {/* Progress Indicator */}
          <ProgressIndicator progress={uploadProgress.combine} type="combine" />

          {/* Generate Button */}
          <button
            onClick={handleProcessCombineResults}
            disabled={
              !accessGranted || processing.combine || buttonsLocked.combine
            }
            className={`w-full font-medium py-3 px-4 rounded-lg transition-all duration-200 text-sm ${
              buttonsLocked.combine
                ? "cursor-not-allowed"
                : "hover:transform hover:-translate-y-0.5"
            }`}
            style={{
              backgroundColor: buttonsLocked.combine
                ? "#6b7280"
                : processing.combine
                ? "#9333ea"
                : "var(--purple-primary)",
              color: "#ffffff",
              opacity: !accessGranted ? 0.5 : 1,
            }}
          >
            {processing.combine ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Generating Combined Result...</span>
              </div>
            ) : buttonsLocked.combine ? (
              "Combined Result Generated ✓"
            ) : (
              "Generate Combined Result"
            )}
          </button>

          {/* Status Display */}
          {prevMatchData?.hasData && (
            <div
              className="p-3 rounded-lg border"
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border-color)",
              }}
            >
              <p
                className="text-sm font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                Previous Match Data Loaded
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--text-secondary)" }}
              >
                Teams: {prevMatchData.teamCount} | From: {prevMatchData.source}
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}