"use client";

import { useEffect, useState, useRef, MouseEvent } from "react";
import Link from "next/link";

interface FailedFeed {
  url: string;
  failedAt: string;
  error: string;
}

interface ServerStats {
  totalUsers: number;
  usersWithNoFeeds: number;
  totalSources: number;
  totalItems: number;
  lastSyncTime: string | null;
  syncStatus: "idle" | "running" | "completed" | "failed";
  isCurrentlySyncing: boolean;
  failedFeedsCount: number;
  failedFeeds: Record<string, FailedFeed>;
  inactiveSourcesCount: number;
}

export default function ServerStatsPage() {
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Retrieve last sync info from localStorage on initial load
  useEffect(() => {
    const savedSyncInfo = localStorage.getItem('lastSyncInfo');
    if (savedSyncInfo) {
      try {
        const parsedSyncInfo = JSON.parse(savedSyncInfo);
        // Only use saved logs if there are meaningful entries
        if (parsedSyncInfo.logs && parsedSyncInfo.logs.length > 0) {
          setLogs(parsedSyncInfo.logs);
        }
      } catch (e) {
        console.error('Error parsing saved sync info:', e);
      }
    }
  }, []);

  // Poll for status updates when an update is running
  useEffect(() => {
    const checkStatus = async () => {
      try {
        console.log('Checking update status...');
        const response = await fetch(
          "/api/update-all-feeds/status?manual=true", 
          {
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          }
        );
        
        if (!response.ok) {
          console.error(`Status check failed with status: ${response.status}`);
          return;
        }
        
        const data = await response.json();
        console.log('Status response:', data);

        // Update logs if available
        if (data.logs && data.logs.length > 0) {
          setLogs(data.logs);
          // Scroll to bottom of log container
          if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
          }
        }

        // Update sync status
        if (data.isRunning) {
          console.log('Sync is still running...');
        } else if (data.status === "completed" || data.status === "failed") {
          console.log(`Sync ${data.status}, stopping poll`);
          setIsUpdating(false);
          fetchStats(); // Refresh stats when update completes
          
          // Save sync info to localStorage
          if (data.logs && data.logs.length > 0 && data.lastRun) {
            localStorage.setItem('lastSyncInfo', JSON.stringify({
              logs: data.logs,
              lastRun: data.lastRun
            }));
          }
          
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }
      } catch (error) {
        console.error("Error checking status:", error);
      }
    };

    // Initial check immediately
    if (isUpdating && !pollRef.current) {
      console.log('Starting status polling');
      checkStatus();
      pollRef.current = setInterval(checkStatus, 2000); // Check every 2 seconds
    }

    return () => {
      if (pollRef.current) {
        console.log('Cleaning up status polling');
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [isUpdating]);

  // Calculate derived statistics
  const getActiveUsersCount = () => {
    if (!stats) return 0;
    return stats.totalUsers - stats.usersWithNoFeeds;
  };

  const getAverageSourcesPerActiveUser = () => {
    if (!stats) return 0;
    const activeUsers = getActiveUsersCount();
    if (activeUsers === 0) return 0;
    return (stats.totalSources / activeUsers).toFixed(1);
  };

  // Format the last sync time
  const formatLastSync = (timestamp: string | null | undefined) => {
    // Try to get last sync time from localStorage if server doesn't have it
    let timeToUse = timestamp;
    if (!timeToUse) {
      try {
        const savedSyncInfo = localStorage.getItem('lastSyncInfo');
        if (savedSyncInfo) {
          const parsedSyncInfo = JSON.parse(savedSyncInfo);
          timeToUse = parsedSyncInfo.lastRun;
        }
      } catch (e) {
        console.error('Error parsing saved sync time:', e);
      }
    }
    
    if (!timeToUse) return "Never";
    
    const lastSync = new Date(timeToUse);
    const now = new Date();
    const diffMs = now.getTime() - lastSync.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
    
    return lastSync.toLocaleDateString();
  };

  // Start a manual update
  const startUpdate = async (clearFailedFeeds: boolean | MouseEvent<HTMLButtonElement> = false) => {
    try {
      setIsUpdating(true);
      setLogs(['Starting feed sync...']);
      setShowLogs(true);

      console.log('Sending fetch request to /api/update-all-feeds');
      const controller = new AbortController();
      // Set a timeout in case the request takes too long
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      
      // Add the clearFailedFeeds parameter if requested
      const shouldClearFailedFeeds = typeof clearFailedFeeds === 'boolean' ? clearFailedFeeds : false;
      const url = shouldClearFailedFeeds 
        ? "/api/update-all-feeds?clearFailedFeeds=true" 
        : "/api/update-all-feeds";
        
      const response = await fetch(url, {
        signal: controller.signal,
        // Add cache-busting parameter
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      clearTimeout(timeoutId);
      
      console.log('Response received:', response.status);
      
      // Check if the request was aborted
      if (controller.signal.aborted) {
        throw new Error("Request timed out after 60 seconds");
      }
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Response data:', data);

      if (!data.success) {
        throw new Error(data.error || "Update failed");
      }

      // Save successful sync info to localStorage
      if (data.logs && data.logs.length > 0) {
        localStorage.setItem('lastSyncInfo', JSON.stringify({
          logs: data.logs,
          lastRun: new Date().toISOString() // Use current time as lastRun
        }));
      }

      setLogs(data.logs || []);
      fetchStats(); // Refresh stats
      setIsUpdating(false);
    } catch (error) {
      console.error("Error updating feeds:", error);
      setLogs(prev => [...prev, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
      setIsUpdating(false);
    }
  };

  // Function to fetch server stats
  const fetchStats = async () => {
    try {
      const response = await fetch("/api/server-stats");
      
      // Handle unauthorized case (not logged in)
      if (response.status === 401) {
        window.location.href = "/auth"; // Redirect to auth page
        return;
      }
      
      if (!response.ok) {
        throw new Error("Failed to fetch server statistics");
      }
      
      const data = await response.json();
      setStats(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching stats:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load stats"
      );
      setLoading(false);
    }
  };

  // Initial load and regular refresh
  useEffect(() => {
    fetchStats();
    
    // Refresh stats every 30 seconds
    const refreshInterval = setInterval(fetchStats, 30000);
    
    return () => {
      clearInterval(refreshInterval);
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md p-6 bg-white rounded-lg border border-red-200 shadow-sm">
          <h2 className="text-xl font-bold mb-2 text-red-600">Error</h2>
          <p className="text-gray-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto p-4">
        {/* Tab Navigation */}
        <nav className="flex mb-6 border-b pb-4">
          <Link href="/dashboard/server-stats" className="px-4 py-2 text-blue-600 font-medium border-b-2 border-blue-600">Stats</Link>
          <Link href="/dashboard/prolific-sources" className="px-4 py-2 text-gray-600 hover:text-blue-600">Analysis</Link>
          <Link href="/dashboard/navigate" className="px-4 py-2 text-gray-600 hover:text-blue-600">Navigate</Link>
        </nav>

        {/* Header Area */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-4 md:mb-0">
            Server Statistics
          </h1>
          <div className="flex flex-col items-end">
            <div className="text-sm text-gray-600 mb-2">
              Last Sync: <span className="font-semibold text-gray-800">{formatLastSync(stats?.lastSyncTime)}</span>
            </div>
            <button
              onClick={startUpdate}
              disabled={isUpdating || stats?.isCurrentlySyncing}
              className={`px-4 py-2 rounded-lg text-white transition-all duration-200 ${
                isUpdating || stats?.isCurrentlySyncing
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isUpdating || stats?.isCurrentlySyncing 
                ? "Syncing..." 
                : "Sync All Feeds Now"}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-4xl font-bold text-gray-800 mb-2">
              {stats ? stats.totalUsers - stats.usersWithNoFeeds : 0}
            </div>
            <div className="text-sm text-gray-600">Active Users</div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-4xl font-bold text-gray-800 mb-2">
              {stats?.totalSources || 0}
            </div>
            <div className="text-sm text-gray-600">Total Sources</div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-4xl font-bold text-gray-800 mb-2">
              {stats?.totalItems || 0}
            </div>
            <div className="text-sm text-gray-600">Total Items</div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm opacity-70">
            <div className="text-4xl font-bold text-gray-600 mb-2">
              {stats?.usersWithNoFeeds || 0}
            </div>
            <div className="text-sm text-gray-500">
              Inactive Users
            </div>
          </div>
        </div>
        
        {/* Status Section - Only shown when syncing */}
        {(showLogs || isUpdating) && (
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800">Sync Status</h3>
              {!isUpdating && (
                <button
                  onClick={() => setShowLogs(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Close
                </button>
              )}
            </div>

            <div
              ref={logContainerRef}
              className="max-h-96 overflow-y-auto bg-gray-50 p-4 rounded border border-gray-200 text-sm text-gray-700"
            >
              {isUpdating && (
                <div className="text-center py-4 text-gray-500">
                  {logs.length <= 1 ? (
                    <>
                      <div className="animate-pulse mb-2">Syncing feeds... please wait</div>
                      <div className="text-xs text-gray-500">
                        (This may take up to a minute to start)
                      </div>
                    </>
                  ) : (
                    <div className="animate-pulse">Sync in progress...</div>
                  )}
                </div>
              )}
              
              {logs.length > 0 && (
                <div>
                  {logs
                    .filter(log => 
                      (log.includes("Adding") && log.includes("new items")) || 
                      log.includes("Feed Update Complete") || 
                      log.includes("Summary:") ||
                      (log.includes("Error") && !log.includes("Error processing"))
                    )
                    .map((log, index) => {
                      // Format "Adding X new items from URL" logs to be more readable
                      if (log.includes("Adding") && log.includes("new items from")) {
                        const match = log.match(/Adding (\d+) new items from (.+)/);
                        if (match) {
                          const [_, count, url] = match;
                          return (
                            <div key={index} className="py-1 border-b border-gray-100">
                              <span className="text-green-600">✓</span> {count} new posts from{" "}
                              <span className="text-blue-600">{url}</span>
                            </div>
                          );
                        }
                      }
                      
                      // Format summary section
                      if (log.includes("Summary:")) {
                        return (
                          <div key={index} className="mt-4 pt-4 border-t border-gray-200">
                            <div className="font-semibold text-gray-800 mb-2">Summary</div>
                            {log.split("\n").slice(1).map((line, i) => {
                              // Highlight the skipped feeds due to failures
                              if (line.includes("Skipped feeds (previous failures)")) {
                                return (
                                  <div key={`${index}-${i}`} className="py-1 text-amber-600">
                                    {line.replace("•", "→")}
                                  </div>
                                );
                              }
                              return (
                                <div key={`${index}-${i}`} className="py-1">
                                  {line.replace("•", "→")}
                                </div>
                              );
                            })}
                          </div>
                        );
                      }
                                              
                      // Show errors but filter out feed processing errors
                      if (log.includes("Error") && !log.includes("Error processing")) {
                        return (
                          <div key={index} className="py-1 text-red-600">
                            ⚠️ {log}
                          </div>
                        );
                      }
                      
                      return null;
                    })
                    .filter(Boolean)
                  }
                </div>
              )}
            </div>
          </div>
        )}

        {/* Additional Info Section only shown when sync not running */}
        {!isUpdating && !showLogs && (
          <>
            {/* Feed Status Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Inactive Feeds Count */}
              {stats?.inactiveSourcesCount && stats.inactiveSourcesCount > 0 && (
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-4">Blocked Feeds</h3>
                  <div className="flex items-center">
                    <div className="text-3xl font-bold text-red-600 mr-4">
                      {stats?.inactiveSourcesCount || 0}
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-1">
                        Feeds are blocked from syncing
                      </div>
                      <Link 
                        href="/dashboard/prolific-sources" 
                        className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-700 inline-block"
                      >
                        Manage Blocked Feeds
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Failed Feeds Count */}
              {stats?.failedFeedsCount && stats.failedFeedsCount > 0 && (
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-4">Temporarily Failing Feeds</h3>
                  <div className="flex items-center">
                    <div className="text-3xl font-bold text-amber-600 mr-4">
                      {stats?.failedFeedsCount || 0}
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-1">
                        Feeds are temporarily failing
                      </div>
                      <button 
                        onClick={() => {
                          setIsUpdating(true);
                          setLogs(['Clearing failed feeds and starting a new sync...']);
                          setShowLogs(true);
                          startUpdate(true);
                        }}
                        className="text-xs bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded text-amber-800 inline-block"
                      >
                        Reset Failed & Sync
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}