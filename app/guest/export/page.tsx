"use client";

import { useEffect, useState } from "react";
import { validateRSSFeed } from "@/app/actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import MetricsDisplay from "@/components/ui/MetricsDisplay";
import { calculateMetrics } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Loader2, ArrowDown, Check, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { SignInButton, useUser } from "@clerk/nextjs";

interface FeedItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  content?: string;
}

interface FeedEntry {
  id: string;
  url: string;
  status: "idle" | "loading" | "success" | "error";
  errorMessage?: string;
  postCount?: number;
}

export default function ExportPage() {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [feeds, setFeeds] = useState<FeedEntry[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const { isLoaded, isSignedIn, user } = useUser();

  useEffect(() => {
    // Only redirect if no feedUrls parameter was passed in the query string
    const feedUrls = searchParams.getAll("feedUrls");
    if (feedUrls.length === 0) {
      router.replace("/");
    }
  }, [router, searchParams]);

  useEffect(() => {
    async function loadFeedData() {
      const urlParams = new URLSearchParams(window.location.search);
      const feedUrls = urlParams.getAll("feedUrls");
      // Fetch feed data then mark loading as finished
      await fetchFeedData(feedUrls);
      setFeeds(
        feedUrls.map((url, index) => ({
          id: String(index + 1),
          url,
          status: "idle",
        }))
      );
      setIsLoadingData(false);
    }
    loadFeedData();
  }, []);

  const fetchFeedData = async (feedUrls: string[]) => {
    try {
      const response = await fetch("/api/fetch-feeds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sources: feedUrls }), // Use feed URLs from previous page
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setFeedItems(
        data.items.sort(
          (a: FeedItem, b: FeedItem) =>
            new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
        )
      );
    } catch (error) {
      console.error("Error fetching feed data:", error);
    }
  };

  const handleExport = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(feedItems));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "feeds_export.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleInputChange = (id: string, value: string) => {
    setFeeds((current) =>
      current.map((feed) =>
        feed.id === id
          ? {
              ...feed,
              url: value,
              status: "idle" as const,
              errorMessage: undefined,
              postCount: undefined,
            }
          : feed
      )
    );

    if (value.trim()) {
      validateFeed(id, value);
    }
  };

  const validateFeed = async (id: string, value: string) => {
    setFeeds((current) =>
      current.map((feed) =>
        feed.id === id ? { ...feed, status: "loading" as const } : feed
      )
    );

    try {
      const result = await validateRSSFeed(value);
      if (result.success) {
        setFeeds((current) => {
          const updatedFeed: FeedEntry = {
            ...current.find((f) => f.id === id)!,
            status: "success" as const,
            url: result.feedUrl || value,
            postCount: result.postCount,
          };

          return current.map((feed) => (feed.id === id ? updatedFeed : feed));
        });

        // Update the URL in the browser
        const newFeedUrls = feeds.map((feed) => feed.url).filter(Boolean);
        const queryString = newFeedUrls
          .map((url) => `feedUrls=${encodeURIComponent(url)}`)
          .join("&");
        window.history.replaceState(null, "", `?${queryString}`);

        // Fetch new feed data
        fetchFeedData(newFeedUrls);
      } else {
        setFeeds((current) =>
          current.map((feed) =>
            feed.id === id
              ? {
                  ...feed,
                  status: "error" as const,
                  errorMessage: result.error,
                }
              : feed
          )
        );
      }
    } catch (error) {
      setFeeds((current) =>
        current.map((feed) =>
          feed.id === id
            ? {
                ...feed,
                status: "error" as const,
                errorMessage: "Failed to validate feed",
              }
            : feed
        )
      );
    }
  };

  const metrics = calculateMetrics(feedItems);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!username.trim()) {
      setError("Username cannot be empty");
      return;
    }
    try {
      const res = await fetch("/api/createUser", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: username.trim() }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        console.error(errorData);
        throw new Error("Failed to create user");
      }
      // Refresh the page so that the updated user data (with username) is loaded.
      router.refresh();
    } catch (err) {
      setError("Failed to create user. Please try again.");
      console.error(err);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div>Loading...</div>
      </div>
    );
  }

  if (!isSignedIn) {
    // If the user is not signed in, show a sign-in prompt.
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <p className="mb-4">You must be signed in to continue.</p>
        <SignInButton />
      </div>
    );
  }

  if (!user?.username) {
    // User is signed in but has not chosen a username yet.
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <h1 className="text-2xl font-bold mb-4">Choose a Username</h1>
        <form onSubmit={handleSubmit} className="w-full max-w-md px-4">
          <input
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded mb-2"
          />
          <button
            type="submit"
            className="w-full p-2 bg-blue-500 text-white rounded"
          >
            Submit
          </button>
          {error && <p className="text-red-500 mt-2">{error}</p>}
        </form>
      </div>
    );
  }

  // Display a loading screen until feed data is fetched
  if (isLoadingData) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="text-xl font-bold">Loading...</div>
      </div>
    );
  }

  // Main UI (when user is signed in and has chosen a username)
  return (
    <div className="min-h-screen bg-white">
      <div className="p-8">
        <MetricsDisplay {...metrics} />
        <div className="flex justify-center items-center my-8">
          <Button
            onClick={() => setIsModalOpen(true)}
            className="text-sm hover:bg-blue-500 mr-2"
          >
            Edit feeds
          </Button>
          <Button onClick={handleExport} className="text-sm hover:bg-blue-500">
            Export as JSON
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {feedItems.map((item, index) => (
              <TableRow key={index}>
                <TableCell>
                  {new Date(item.pubDate).toLocaleDateString()}
                </TableCell>
                <TableCell>{item.title}</TableCell>
                <TableCell>{item.source}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
