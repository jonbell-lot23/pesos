"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import useSWR from "swr";

interface Post {
  title: string;
  postdate: Date;
  url: string;
}

interface Stats {
  lastChecked: Date;
  totalPosts: number;
}

function parseDate(dateStr: string): Date {
  try {
    const date = new Date(dateStr);
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.error("Invalid date string received:", dateStr);
      return new Date(); // Fallback to current time
    }
    return date;
  } catch (error) {
    console.error("Error parsing date:", dateStr, error);
    return new Date(); // Fallback to current time
  }
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch data");
  return res.json();
};

export default function SimpleDashboard() {
  const [showFeedEditor, setShowFeedEditor] = useState(false);

  const {
    data: postsData,
    error: postsError,
    isLoading: postsLoading,
  } = useSWR("/api/getPosts?limit=1", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshInterval: 120000, // Refresh every 2 minutes
  });

  const {
    data: statsData,
    error: statsError,
    isLoading: statsLoading,
  } = useSWR("/api/database-stats", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshInterval: 300000, // Refresh every 5 minutes
  });

  const isLoading = postsLoading || statsLoading;
  const error = postsError || statsError;

  const latestPost = postsData?.posts?.[0]
    ? {
        title: postsData.posts[0].title,
        postdate: parseDate(postsData.posts[0].postdate),
        url: postsData.posts[0].url,
      }
    : null;

  const stats = statsData
    ? {
        lastChecked: parseDate(statsData.lastBackupTime || new Date()),
        totalPosts: postsData?.total || 0,
      }
    : null;

  useEffect(() => {
    if (postsData?.posts?.length === 0) {
      // Auto-trigger the feed editor by simulating a click on the gear icon
      const gearButton = document.querySelector(
        "button:has(.lucide-settings)"
      ) as HTMLButtonElement;
      if (gearButton) {
        gearButton.click();
      }
    }
  }, [postsData]);

  if (isLoading) {
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
          <h2 className="text-xl font-bold mb-2">Error loading data</h2>
          <p>{error.message}</p>
        </div>
      </div>
    );
  }

  const formatDate = (date: Date) => {
    try {
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      console.error("Error formatting date:", date, error);
      return "recently";
    }
  };

  if (latestPost) {
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
              background-image: url("/v_couch_1.jpg");
            }
          }
          @media (min-width: 769px) {
            .bg-image {
              background-image: url("/couch_5.jpg");
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
                {latestPost ? "All good!" : "Nice to meet you!"}
              </h1>

              <div className="space-y-4 md:space-y-8">
                <p className="text-xl md:text-2xl leading-snug text-white font-medium">
                  You have{" "}
                  <span className="font-extrabold">{stats?.totalPosts}</span>{" "}
                  items stored, and your most recent item is{" "}
                  <a
                    href={latestPost.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-extrabold text-white no-underline hover:underline hover:text-white visited:text-white active:text-white"
                  >
                    {latestPost.title}
                  </a>{" "}
                  which was posted{" "}
                  <span className="font-extrabold">
                    {formatDate(latestPost.postdate)}
                  </span>
                  .
                </p>

                <p className="text-xl md:text-2xl leading-snug text-white font-medium">
                  Right now we're checking feeds once an hour.
                </p>
              </div>

              <div className="absolute bottom-8 left-0 right-0 md:relative md:bottom-auto md:mt-8 px-4 md:px-0">
                <p className="text-xl md:text-2xl leading-snug text-white font-medium">
                  <Link
                    href="/dashboard/all_posts"
                    className="font-extrabold text-white no-underline hover:underline hover:text-white visited:text-white active:text-white"
                  >
                    Switch to advanced mode {"->"}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  } else {
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
              background-image: url("/v_couch_1.jpg");
            }
          }
          @media (min-width: 769px) {
            .bg-image {
              background-image: url("/couch_5.jpg");
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
                Nice to meet you!
              </h1>

              <div className="space-y-4 md:space-y-8">
                <p className="text-xl md:text-2xl leading-snug text-white font-medium">
                  To get started, let's add a project and see if it has an RSS
                  feed we can reach.
                </p>
                <p className="text-xl md:text-2xl leading-snug text-white font-medium opacity-75">
                  Note: New feeds will be checked within the next hour as part
                  of our regular updates.
                </p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
}
