"use client";

import { useEffect, useState } from "react";

interface ServerStats {
  totalUsers: number;
  usersWithNoFeeds: number;
  totalSources: number;
  totalItems: number;
}

export default function ServerStatsPage() {
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/server-stats");
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

    fetchStats();
  }, []);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
          height: 100vh;
        }
      `}</style>
      <style jsx>{`
        @media (max-width: 768px) {
          .bg-image {
            background-image: url("/v_server_1.jpg");
          }
        }
        @media (min-width: 769px) {
          .bg-image {
            background-image: url("/server_1.jpg");
          }
        }
      `}</style>
      <div className="fixed left-0 right-0 bottom-0 top-[64px] bg-black overflow-hidden">
        <div
          className="absolute inset-0 bg-image opacity-70"
          style={{
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />

        {/* Content Overlay */}
        <div className="relative h-full overflow-hidden">
          <div className="w-full px-4 md:px-8 md:max-w-2xl md:mx-auto pt-6 md:pt-12">
            <h1 className="text-3xl md:text-4xl font-extrabold mb-6 md:mb-12 text-white tracking-tight">
              Server Statistics
            </h1>

            <div className="bg-black bg-opacity-50 p-6 rounded-lg">
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-white mb-2">
                    {stats?.totalUsers || 0}
                  </div>
                  <div className="text-sm text-gray-300">Total Users</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-white mb-2">
                    {stats?.usersWithNoFeeds || 0}
                  </div>
                  <div className="text-sm text-gray-300">
                    Users Without Feeds
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-white mb-2">
                    {stats?.totalSources || 0}
                  </div>
                  <div className="text-sm text-gray-300">Total Sources</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-white mb-2">
                    {stats?.totalItems || 0}
                  </div>
                  <div className="text-sm text-gray-300">Total Items</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-white mb-2">
                    {stats &&
                      (
                        (stats.usersWithNoFeeds / stats.totalUsers) *
                        100
                      ).toFixed(1)}
                    %
                  </div>
                  <div className="text-sm text-gray-300">
                    Users Haven't Set Up Feeds
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-white mb-2">
                    {getAverageSourcesPerActiveUser()}
                  </div>
                  <div className="text-sm text-gray-300">
                    Average Sources per Active User
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
