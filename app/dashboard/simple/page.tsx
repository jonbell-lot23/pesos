"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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

export default function SimpleDashboard() {
  const [latestPost, setLatestPost] = useState<Post | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch latest post
        const postsResponse = await fetch("/api/getPosts?limit=1");
        if (!postsResponse.ok) throw new Error("Failed to fetch posts");
        const postsData = await postsResponse.json();

        if (postsData.posts && postsData.posts.length > 0) {
          console.log("Post date received:", postsData.posts[0].postdate);
          setLatestPost({
            title: postsData.posts[0].title,
            postdate: parseDate(postsData.posts[0].postdate),
            url: postsData.posts[0].url,
          });
        } else {
          // Auto-trigger the feed editor by simulating a click on the gear icon
          const gearButton = document.querySelector(
            "button:has(.lucide-settings)"
          ) as HTMLButtonElement;
          if (gearButton) {
            gearButton.click();
          }
        }

        // Fetch database stats for last check time
        const statsResponse = await fetch("/api/database-stats");
        if (!statsResponse.ok)
          throw new Error("Failed to fetch database stats");
        const statsData = await statsResponse.json();

        console.log("Database stats received:", statsData);
        setStats({
          lastChecked: parseDate(statsData.lastBackupTime || new Date()),
          totalPosts: postsData.total || 0,
        });

        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
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

  return (
    <>
      <style jsx global>{`
        body {
          margin: 0;
          padding: 0;
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

            {latestPost ? (
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
                  which was backed up{" "}
                  <span className="font-extrabold">
                    {formatDate(latestPost.postdate)}
                  </span>
                  .
                </p>

                <p className="text-xl md:text-2xl leading-snug text-white font-medium">
                  Right now we're checking feeds once an hour.
                </p>

                <p className="text-xl md:text-2xl leading-snug text-white font-medium">
                  <Link
                    href="/dashboard/all_posts"
                    className="font-extrabold text-white no-underline hover:underline hover:text-white visited:text-white active:text-white"
                  >
                    Switch to advanced mode
                  </Link>
                </p>
              </div>
            ) : (
              <p className="text-xl md:text-2xl leading-snug text-white font-medium">
                To get started, let's add a project and see if it has an RSS
                feed we can reach.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
