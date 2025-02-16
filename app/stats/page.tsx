"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Spinner from "@/components/Spinner";
import { StatsTable } from "@/components/StatsTable";

interface ActivityEntry {
  date: string;
  count: number;
  type: string;
}

export default function StatsPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded) {
      if (!isSignedIn) {
        router.push("/");
      } else {
        console.log("[StatsPage] Fetching activity stats for user:", user?.id);
        // Fetch activity stats
        fetch("/api/activity-stats")
          .then(async (res) => {
            console.log("[StatsPage] Response status:", res.status);
            const data = await res.json();
            console.log("[StatsPage] Response data:", data);

            if (!res.ok) {
              throw new Error(data.error || "Failed to fetch activity stats");
            }
            return data;
          })
          .then((data) => {
            if (data.activity) {
              console.log("[StatsPage] Setting activity data:", data.activity);
              setActivity(data.activity);
            }
            setLoading(false);
          })
          .catch((error) => {
            console.error("[StatsPage] Error details:", {
              message: error.message,
              stack: error.stack,
            });
            setError(error.message || "Failed to fetch activity stats");
            setLoading(false);
          });
      }
    }
  }, [isLoaded, isSignedIn, router, user?.id]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="text-red-500 mb-4 max-w-lg text-center">
          <div className="font-bold mb-2">Error:</div>
          <div>{error}</div>
          {error.includes("User not found") && (
            <div className="mt-4 text-sm">
              It looks like you haven't completed the user setup process. Please
              go through the initial setup flow first.
            </div>
          )}
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
          {error.includes("User not found") && (
            <button
              onClick={() => router.push("/guest/backup")}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Go to Setup
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Activity Stats</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold mb-2">Total Posts</h2>
          <p className="text-3xl font-bold">
            {activity
              .filter((entry) => entry.type === "Posts")
              .reduce((sum, entry) => sum + entry.count, 0)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold mb-2">Total Sources</h2>
          <p className="text-3xl font-bold">
            {activity
              .filter((entry) => entry.type === "Sources Added")
              .reduce((sum, entry) => sum + entry.count, 0)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold mb-2">Active Days</h2>
          <p className="text-3xl font-bold">
            {new Set(activity.map((entry) => entry.date)).size}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Activity History</h2>
        <StatsTable activity={activity} />
      </div>
    </div>
  );
}
