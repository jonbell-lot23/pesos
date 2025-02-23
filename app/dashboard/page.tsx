"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Spinner from "@/components/Spinner";
import { DataTable } from "@/components/data-table";
import ActivityChart from "@/components/ActivityChart";
import FeedEditor, { FeedEntry } from "@/components/FeedEditor";
import { Button } from "@/components/ui/button";
import UpdateFeedsButton from "@/components/UpdateFeedsButton";
import { Settings, Download } from "lucide-react";

interface Post {
  id: number;
  title: string;
  url: string;
  description: string | null;
  postdate: Date;
  source: string | null;
  slug: string | null;
  Source: {
    emoji: string;
    name: string;
    userid: number;
  } | null;
}

export default function StatsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded, isSignedIn, user } = useUser();
  const [posts, setPosts] = useState<Post[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [showFeedEditor, setShowFeedEditor] = useState(false);
  const [feeds, setFeeds] = useState<FeedEntry[]>([]);
  const [feedEditorError, setFeedEditorError] = useState<string | null>(null);
  const showManualUpdate = searchParams?.get("manual") === "true";

  useEffect(() => {
    if (searchParams) {
      const page = searchParams.get("page");
      if (page) {
        setCurrentPage(parseInt(page) - 1);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (isLoaded) {
      if (!isSignedIn) {
        router.push("/");
      } else {
        const fetchData = async () => {
          try {
            const postsResponse = await fetch(
              `/api/getPosts?offset=${currentPage * 25}&limit=25`
            );

            if (!postsResponse.ok) {
              throw new Error(`Posts API error: ${postsResponse.statusText}`);
            }

            const postsData = await postsResponse.json();

            if (postsData.posts) {
              setPosts(postsData.posts);
              setTotalPosts(postsData.total);
              // Use the paginated posts for the all posts view as well
              setAllPosts(postsData.posts);
            }
            setLoading(false);
          } catch (error: any) {
            console.error("[StatsPage] Error details:", {
              message: error.message,
              stack: error.stack,
            });
            setError(error.message || "Failed to fetch data");
            setLoading(false);
          }
        };

        fetchData();
      }
    }
  }, [isLoaded, isSignedIn, router, user?.id, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const newParams = new URLSearchParams(searchParams?.toString() || "");
    newParams.set("page", (page + 1).toString());
    router.push(`/stats?${newParams.toString()}`);
  };

  const loadFeeds = useCallback(async () => {
    if (!user?.id) return;
    try {
      const response = await fetch("/api/sources");
      if (!response.ok) throw new Error("Failed to load feeds");
      const data = await response.json();
      const existingFeeds: FeedEntry[] = data.sources.map((source: any) => ({
        id: source.id.toString(),
        url: source.url,
        status: "success" as const,
      }));
      setFeeds(existingFeeds);

      // Auto-show feed editor if no feeds exist
      if (existingFeeds.length === 0) {
        setShowFeedEditor(true);
      }
    } catch (error) {
      console.error("Error loading feeds:", error);
    }
  }, [user?.id]);

  // Load feeds on mount
  useEffect(() => {
    if (isSignedIn && user?.id) {
      loadFeeds();
    }
  }, [isSignedIn, user?.id, loadFeeds]);

  const handleEditFeeds = async () => {
    await loadFeeds();
    setShowFeedEditor(true);
  };

  const handleFeedEditorContinue = async (newFeeds: FeedEntry[]) => {
    setFeedEditorError(null);
    try {
      if (!user?.id) throw new Error("User not loaded");

      for (const feed of newFeeds) {
        const response = await fetch("/api/sources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: feed.url,
            userId: user.id,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || `Failed to save feed: ${feed.url}`
          );
        }
      }

      // After saving all feeds, trigger the backup process
      const backupResponse = await fetch("/api/backup", {
        method: "POST",
      });

      if (!backupResponse.ok) {
        const errorData = await backupResponse.json();
        throw new Error(errorData.error || "Failed to start backup process");
      }

      setShowFeedEditor(false);

      // Show a loading state while backup runs
      setLoading(true);
      setError("Backup in progress - this may take a few minutes...");

      // Poll the backup status every 5 seconds
      const pollBackup = async () => {
        try {
          const statusResponse = await fetch("/api/backup/status");
          if (!statusResponse.ok) {
            throw new Error("Failed to check backup status");
          }

          const statusData = await statusResponse.json();

          if (statusData.status === "completed") {
            window.location.reload();
          } else if (statusData.status === "failed") {
            setError("Backup failed. Please try again.");
            setLoading(false);
          } else if (statusData.status === "running") {
            // Still running, check again in 5 seconds
            setTimeout(pollBackup, 5000);
          } else {
            setError("Unknown backup status. Please refresh the page.");
            setLoading(false);
          }
        } catch (error) {
          console.error("Error checking backup status:", error);
          setError("Error checking backup status. Please refresh the page.");
          setLoading(false);
        }
      };

      // Start polling
      setTimeout(pollBackup, 5000);
    } catch (error) {
      console.error("Error saving feeds:", error);
      setFeedEditorError(
        error instanceof Error ? error.message : "Failed to save feeds"
      );
      setLoading(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA]">
        <div className="text-red-500 mb-4 max-w-lg text-center">
          <div className="font-bold mb-2">Error:</div>
          <div>{error}</div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-0 md:px-4 py-4 md:py-8">
      <div className="flex justify-between items-center mb-4 md:mb-8 px-4 md:px-0">
        <h1 className="text-2xl font-bold">Backups</h1>
        <div className="flex gap-4">
          {showManualUpdate && <UpdateFeedsButton />}
        </div>
      </div>

      <div className="mb-8 hidden">
        <ActivityChart posts={allPosts} />
      </div>

      <div className="bg-white rounded-none md:rounded-lg shadow-sm border border-x-0 md:border-x p-3 md:p-6">
        <div className="flex justify-between items-center mb-4 px-2 md:px-0">
          <h2 className="text-lg font-semibold">Recent Posts</h2>
          <div className="flex gap-1 md:gap-2">
            <Button
              onClick={handleEditFeeds}
              className="bg-black text-white hover:bg-gray-800"
            >
              <Settings className="w-4 h-4 md:hidden" />
              <span className="hidden md:inline">Edit Feeds</span>
            </Button>
            <Button
              onClick={async () => {
                try {
                  const response = await fetch("/api/export");
                  if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(
                      errorData.error || "Failed to download backup"
                    );
                  }
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "backup.json";
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                } catch (error) {
                  console.error("Download error:", error);
                  alert(
                    "Failed to download backup: " +
                      (error instanceof Error ? error.message : "Unknown error")
                  );
                }
              }}
              className="bg-black text-white hover:bg-gray-800"
            >
              <Download className="w-4 h-4 md:hidden" />
              <span className="hidden md:inline">Download as JSON</span>
            </Button>
          </div>
        </div>
        <DataTable posts={posts} />

        {/* Pagination */}
        <div className="mt-4 flex justify-center">
          {Array.from({ length: Math.ceil(totalPosts / 25) }, (_, i) => (
            <button
              key={i}
              onClick={() => handlePageChange(i)}
              className={`mx-1 px-3 py-1 rounded ${
                currentPage === i
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {showFeedEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Edit RSS Feeds</h2>
              <Button
                onClick={() => setShowFeedEditor(false)}
                variant="ghost"
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </Button>
            </div>
            {feedEditorError && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
                {feedEditorError}
              </div>
            )}
            <FeedEditor
              initialFeeds={feeds}
              onContinue={handleFeedEditorContinue}
            />
          </div>
        </div>
      )}
    </div>
  );
}
