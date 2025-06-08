"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";

interface ActivityLog {
  id: number;
  timestamp: string;
  eventType: string;
  userId?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  duration?: number;
  success: boolean;
  errorMessage?: string;
  source?: string;
}

interface SystemUpdate {
  id: number;
  timestamp: string;
  totalFeeds: number;
  processedFeeds: number;
  failedFeeds: number;
  newItems: number;
  executionTimeMs: number;
  triggeredBy?: string;
  summary?: string;
}

interface AdminData {
  logs: ActivityLog[];
  totalCount: number;
  stats: {
    newUsers: number;
    totalLogins: number;
    errorCount: number;
    systemUpdates: number;
    period: string;
  };
  breakdowns: {
    eventTypes: Array<{ eventType: string; count: number }>;
    users: Array<{ userId: string; count: number }>;
    sources: Array<{ source: string; count: number }>;
  };
  recentSystemUpdates: SystemUpdate[];
}

export default function AdminDashboard() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    eventType: "",
    success: "",
    source: "",
    days: "7",
    limit: "100"
  });
  const [page, setPage] = useState(0);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...filters,
        offset: (page * parseInt(filters.limit)).toString()
      });
      
      // Remove empty params
      Object.entries(filters).forEach(([key, value]) => {
        if (!value) params.delete(key);
      });

      const response = await fetch(`/api/admin/activity-logs?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch admin data");
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters, page]);

  const formatTimestamp = (timestamp: string) => {
    return format(new Date(timestamp), "MMM dd, HH:mm:ss");
  };

  const formatEventType = (eventType: string) => {
    return eventType.split("_").map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  };

  const formatMetadata = (metadata: any) => {
    if (!metadata) return "-";
    if (typeof metadata === "string") return metadata;
    return JSON.stringify(metadata);
  };

  const getEventTypeColor = (eventType: string, success: boolean) => {
    if (!success) return "text-red-600 bg-red-50";
    
    if (eventType.includes("user")) return "text-blue-600 bg-blue-50";
    if (eventType.includes("system")) return "text-purple-600 bg-purple-50";
    if (eventType.includes("feed")) return "text-green-600 bg-green-50";
    return "text-gray-600 bg-gray-50";
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-6 bg-white rounded-lg border border-red-200 shadow-sm">
          <h2 className="text-xl font-bold mb-2 text-red-600">Error</h2>
          <p className="text-gray-700">{error}</p>
          <button 
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="mt-2 text-gray-600">
              System activity monitoring and logging
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">{data.stats.newUsers}</div>
              <div className="text-sm text-gray-600">New Users</div>
              <div className="text-xs text-gray-500 mt-1">{data.stats.period}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">{data.stats.totalLogins}</div>
              <div className="text-sm text-gray-600">Total Logins</div>
              <div className="text-xs text-gray-500 mt-1">{data.stats.period}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">{data.stats.systemUpdates}</div>
              <div className="text-sm text-gray-600">System Updates</div>
              <div className="text-xs text-gray-500 mt-1">{data.stats.period}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className={`text-2xl font-bold ${data.stats.errorCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {data.stats.errorCount}
              </div>
              <div className="text-sm text-gray-600">Errors</div>
              <div className="text-xs text-gray-500 mt-1">{data.stats.period}</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
              <select
                value={filters.eventType}
                onChange={(e) => setFilters({...filters, eventType: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                <option value="">All Events</option>
                <option value="user_created">User Created</option>
                <option value="user_login">User Login</option>
                <option value="system_update_completed">System Update</option>
                <option value="page_view">Page View</option>
                <option value="api_call">API Call</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Success</label>
              <select
                value={filters.success}
                onChange={(e) => setFilters({...filters, success: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                <option value="">All</option>
                <option value="true">Success</option>
                <option value="false">Failed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
              <select
                value={filters.source}
                onChange={(e) => setFilters({...filters, source: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                <option value="">All Sources</option>
                <option value="web">Web</option>
                <option value="api">API</option>
                <option value="cron">Cron</option>
                <option value="system">System</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Period</label>
              <select
                value={filters.days}
                onChange={(e) => setFilters({...filters, days: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                <option value="1">Last 24 hours</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Per Page</label>
              <select
                value={filters.limit}
                onChange={(e) => setFilters({...filters, limit: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="250">250</option>
                <option value="500">500</option>
              </select>
            </div>
          </div>
        </div>

        {/* Activity Logs Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Activity Logs 
              {data && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  ({data.totalCount.toLocaleString()} total)
                </span>
              )}
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data?.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getEventTypeColor(log.eventType, log.success)}`}>
                        {formatEventType(log.eventType)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {log.userId ? log.userId.substring(0, 12) + "..." : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {log.source || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.success ? (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          Success
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {log.duration ? `${log.duration}ms` : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {log.errorMessage || formatMetadata(log.metadata)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.totalCount > parseInt(filters.limit) && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {page * parseInt(filters.limit) + 1} to {Math.min((page + 1) * parseInt(filters.limit), data.totalCount)} of {data.totalCount} results
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={(page + 1) * parseInt(filters.limit) >= data.totalCount}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Recent System Updates */}
        {data?.recentSystemUpdates && data.recentSystemUpdates.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Recent System Updates</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Feeds Processed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      New Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Failed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Triggered By
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.recentSystemUpdates.map((update) => (
                    <tr key={update.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        {formatTimestamp(update.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {update.processedFeeds} / {update.totalFeeds}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {update.newItems}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {update.failedFeeds > 0 ? (
                          <span className="text-red-600">{update.failedFeeds}</span>
                        ) : (
                          <span className="text-green-600">0</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(update.executionTimeMs / 1000).toFixed(1)}s
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {update.triggeredBy || "Unknown"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
