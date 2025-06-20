"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ProlificSource {
  id: number;
  url: string;
  active: string;
  itemCount?: number;
  userCount?: number;
  oldestPost?: string | null;
  newestPost?: string | null;
  avgHoursBetweenPosts?: string | null;
  postsPerDay?: string | null;
}

export default function ProlificSourcesPage() {
  const [sources, setSources] = useState<ProlificSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [minItems, setMinItems] = useState(10);
  const [days, setDays] = useState(7);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchSources = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/source-stats?minItems=${minItems}&days=${days}`);
        
        // Handle not found (not logged in)
        if (response.status === 404) {
          // Instead of redirecting, just show a 404 error
          setError("Page not found");
          setLoading(false);
          return;
        }
        
        // Skipping the 403 check since we've removed the admin check in the API
        
        if (!response.ok) {
          throw new Error("Failed to fetch source statistics");
        }
        
        const data = await response.json();
        const result = data.prolificSources || data.sources || [];
        setSources(Array.isArray(result) ? result : []);
        // Always set isAdmin to true since we've removed the admin check
        setIsAdmin(true);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching sources:", error);
        setError(
          error instanceof Error ? error.message : "Failed to load sources"
        );
        setLoading(false);
      }
    };

    fetchSources();
  }, [minItems, days]);

  const toggleSourceStatus = async (sourceId: number, currentStatus: string) => {
    try {
      const response = await fetch("/api/blocked-feeds", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceId,
          block: currentStatus === "Y"
        }),
      });

      // Handle not found (not logged in)
      if (response.status === 404) {
        // Instead of redirecting, just show a 404 error
        alert("Page not found");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to update source status");
      }

      // Update the source status in the UI
      setSources(
        sources.map(source => 
          source.id === sourceId 
            ? { ...source, active: currentStatus === "Y" ? "N" : "Y" } 
            : source
        )
      );
    } catch (error) {
      console.error("Error updating source status:", error);
      alert(error instanceof Error ? error.message : "Failed to update source");
    }
  };

  const getSourceDomain = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return domain;
    } catch {
      return url;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Prolific Sources Analysis</h1>
          <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-6 text-white">
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p>{error}</p>
            {error === "Page not found" && (
              <p className="mt-4">
                This page does not exist or is not available.
              </p>
            )}
          </div>
          <div className="mt-6">
            <Link
              href="/admin"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
            >
              Back to Server Stats
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-white">
      <div className="container mx-auto">
        {/* Tab Navigation */}
        <nav className="flex mb-6 border-b pb-4">
          <Link href="/admin" className="px-4 py-2 text-gray-600 hover:text-blue-600">Stats</Link>
          <Link href="/dashboard/prolific-sources" className="px-4 py-2 text-blue-600 font-medium border-b-2 border-blue-600">Analysis</Link>
          <Link href="/dashboard/navigate" className="px-4 py-2 text-gray-600 hover:text-blue-600">Navigate</Link>
        </nav>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Prolific Sources Analysis</h1>
        </div>

        {/* Filters */}
        <div className="bg-gray-100 p-4 rounded-lg mb-6 border border-gray-200">
          <h2 className="text-lg font-semibold mb-3 text-gray-800">Filters</h2>
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm mb-1 text-gray-600">Min Items</label>
              <select 
                value={minItems} 
                onChange={(e) => setMinItems(Number(e.target.value))}
                className="bg-white border border-gray-300 rounded px-3 py-1 text-gray-700"
              >
                <option value={10}>10+</option>
                <option value={50}>50+</option>
                <option value={100}>100+</option>
                <option value={200}>200+</option>
                <option value={500}>500+</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1 text-gray-600">Time Period</label>
              <select 
                value={days} 
                onChange={(e) => setDays(Number(e.target.value))}
                className="bg-white border border-gray-300 rounded px-3 py-1 text-gray-700"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={365}>Last year</option>
              </select>
            </div>
          </div>
          <div className="mt-3 text-sm text-gray-600">
            Showing sources with at least {minItems} items in the last {days} days
          </div>
        </div>

        {/* Results */}
        {sources.length === 0 ? (
          <div className="bg-white p-6 border border-gray-200 rounded-lg text-center text-gray-700">
            <p>No sources meet the current filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full bg-white rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600 font-semibold">Source</th>
                  <th className="px-4 py-3 text-center text-gray-600 font-semibold">Status</th>
                  <th className="px-4 py-3 text-center text-gray-600 font-semibold">Items</th>
                  <th className="px-4 py-3 text-center text-gray-600 font-semibold">Users</th>
                  <th className="px-4 py-3 text-center text-gray-600 font-semibold">Posts/Day</th>
                  <th className="px-4 py-3 text-center text-gray-600 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((source) => (
                  <tr key={source.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-800">{getSourceDomain(source.url)}</div>
                        <div className="text-xs text-gray-500 truncate max-w-xs">{source.url}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                        source.active === "Y" 
                          ? "bg-green-100 text-green-800" 
                          : "bg-red-100 text-red-800"
                      }`}>
                        {source.active === "Y" ? "Active" : "Blocked"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700">{source.itemCount}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{source.userCount}</td>
                    <td className="px-4 py-3 text-center">
                      {source.postsPerDay ? (
                        <span className={`font-semibold ${
                          parseFloat(source.postsPerDay) > 20 
                            ? "text-red-600" 
                            : parseFloat(source.postsPerDay) > 5 
                              ? "text-amber-600" 
                              : "text-green-600"
                        }`}>
                          {source.postsPerDay}/day
                        </span>
                      ) : "N/A"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleSourceStatus(source.id, source.active)}
                        className={`px-3 py-1 rounded text-xs ${
                          source.active === "Y"
                            ? "bg-red-100 hover:bg-red-200 text-red-800 border border-red-300"
                            : "bg-green-100 hover:bg-green-200 text-green-800 border border-green-300"
                        }`}
                      >
                        {source.active === "Y" ? "Block" : "Unblock"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 text-sm text-gray-600 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold mb-2 text-blue-800">About This Page</h3>
          <p>
            This analysis helps identify potentially problematic or overly prolific sources.
            Sources with a high post frequency (like news sites) can overwhelm personal feeds.
          </p>
          <p className="mt-2">
            Color indicators: <span className="text-green-600">Green</span> (normal posting frequency),{" "}
            <span className="text-amber-600">Yellow</span> (high posting frequency),{" "}
            <span className="text-red-600">Red</span> (very high posting frequency).
          </p>
        </div>
      </div>
    </div>
  );
}