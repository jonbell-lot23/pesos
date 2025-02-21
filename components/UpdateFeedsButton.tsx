"use client";

import { useState, useEffect, useRef } from "react";

export default function UpdateFeedsButton() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Poll for status updates when an update is running
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        const response = await fetch(
          "/api/update-all-feeds/status?manual=true"
        );
        const data = await response.json();

        if (data.logs) {
          setLogs(data.logs);
          // Scroll to bottom of log container
          if (logContainerRef.current) {
            logContainerRef.current.scrollTop =
              logContainerRef.current.scrollHeight;
          }
        }

        if (data.status === "completed" || data.status === "failed") {
          setIsUpdating(false);
          if (data.status === "failed") {
            setError(data.lastError || "Update failed");
          }
        }
      } catch (error) {
        console.error("Error checking status:", error);
      }
    };

    if (isUpdating) {
      pollInterval = setInterval(checkStatus, 1000);
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [isUpdating]);

  const startUpdate = async () => {
    try {
      setIsUpdating(true);
      setError(null);
      setLogs([]);
      setIsExpanded(true);

      const response = await fetch("/api/update-all-feeds");
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Update failed");
      }

      setLogs(data.logs || []);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
      setIsUpdating(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={startUpdate}
        disabled={isUpdating}
        className={`px-4 py-2 rounded-lg text-white transition-all duration-200 ${
          isUpdating
            ? "bg-gray-500 cursor-not-allowed"
            : "bg-blue-500 hover:bg-blue-600"
        }`}
      >
        {isUpdating ? "Updating..." : "Update Feeds"}
      </button>

      {/* Log display */}
      {(isExpanded || isUpdating) && (
        <div
          className="absolute top-full left-0 right-0 mt-2 p-4 bg-black/90 rounded-lg text-white font-mono text-sm"
          style={{ minWidth: "500px", maxWidth: "800px", zIndex: 1000 }}
        >
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold">Update Logs</h3>
            {!isUpdating && (
              <button
                onClick={() => setIsExpanded(false)}
                className="text-gray-400 hover:text-white"
              >
                Close
              </button>
            )}
          </div>

          <div
            ref={logContainerRef}
            className="max-h-96 overflow-y-auto space-y-1"
          >
            {logs.map((log, index) => (
              <div key={index} className="whitespace-pre-wrap break-all">
                {log}
              </div>
            ))}
            {error && (
              <div className="text-red-500 font-bold mt-2">{error}</div>
            )}
            {isUpdating && logs.length === 0 && (
              <div className="text-gray-400">
                Waiting for update to start...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
