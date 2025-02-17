"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Spinner from "@/components/Spinner";
import { DataTable } from "@/components/data-table";
import ActivityChart from "@/components/ActivityChart";
import FeedEditor, { FeedEntry } from "@/components/FeedEditor";
import { Button } from "@/components/ui/button";

interface Stats {
  totalPosts: number;
  daysSinceLastPost: number;
  averageTimeBetweenPosts: number;
  medianTimeBetweenPosts: number;
  averagePostLength: number;
}

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
  const [stats, setStats] = useState<Stats | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [showFeedEditor, setShowFeedEditor] = useState(false);
  const [feeds, setFeeds] = useState<FeedEntry[]>([]);
  const [feedEditorError, setFeedEditorError] = useState<string | null>(null);

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
            const [statsResponse, postsResponse, allPostsResponse] =
              await Promise.all([
                fetch("/api/database-stats"),
                fetch(`/api/getPosts?offset=${currentPage * 25}&limit=25`),
                fetch(`/api/getPosts?limit=200`),
              ]);

            if (!statsResponse.ok) {
              throw new Error(`Stats API error: ${statsResponse.statusText}`);
            }
            if (!postsResponse.ok) {
              throw new Error(`Posts API error: ${postsResponse.statusText}`);
            }
            if (!allPostsResponse.ok) {
              throw new Error(
                `All posts API error: ${allPostsResponse.statusText}`
              );
            }

            const statsData = await statsResponse.json();
            const postsData = await postsResponse.json();
            const allPostsData = await allPostsResponse.json();

            if (statsData.stats) {
              setStats(statsData.stats);
            }
            if (postsData.posts) {
              setPosts(postsData.posts);
              setTotalPosts(postsData.total);
            }
            if (allPostsData.posts) {
              setAllPosts(allPostsData.posts.slice(0, 200));
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

  const loadFeeds = async () => {
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
    } catch (error) {
      console.error("Error loading feeds:", error);
    }
  };

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

      setShowFeedEditor(false);
      window.location.reload();
    } catch (error) {
      console.error("Error saving feeds:", error);
      setFeedEditorError(
        error instanceof Error ? error.message : "Failed to save feeds"
      );
    }
  };

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
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Database Stats</h1>
        <Button
          onClick={handleEditFeeds}
          className="bg-blue-500 text-white hover:bg-blue-600"
        >
          Edit Feeds
        </Button>
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

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <p className="text-3xl font-bold">{stats.totalPosts}</p>
            <h2 className="text-lg font-semibold">Total Posts</h2>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <p className="text-3xl font-bold">{stats.daysSinceLastPost} days</p>
            <h2 className="text-lg font-semibold">Time Since Last Post</h2>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <p className="text-3xl font-bold">
              {stats.averageTimeBetweenPosts} days
            </p>
            <h2 className="text-lg font-semibold">
              Average Time Between Posts
            </h2>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <p className="text-3xl font-bold">
              {stats.medianTimeBetweenPosts} hours
            </p>
            <h2 className="text-lg font-semibold">Median Time Between Posts</h2>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <p className="text-3xl font-bold">
              {stats.averagePostLength.toFixed(2)}
            </p>
            <h2 className="text-lg font-semibold">Average Length of Posts</h2>
          </div>
        </div>
      )}

      <div className="mb-8">
        <ActivityChart posts={allPosts} />
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Posts</h2>
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
    </div>
  );
}
