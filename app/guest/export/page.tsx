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

  // Display a loading screen until feed data is fetched
  if (isLoadingData) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="text-xl font-bold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-between items-center">
      <div className="flex min-h-screen w-full flex-col p-8">
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

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded shadow-lg w-1/2">
            <h2 className="text-xl font-bold mb-4">Edit Feeds</h2>
            {feeds.map((feed, index) => (
              <div
                key={feed.id}
                className="relative flex items-center gap-4 mb-2"
              >
                <div className="relative flex-grow">
                  <Input
                    type="url"
                    placeholder="Enter RSS feed URL"
                    value={feed.url}
                    onChange={(e) => handleInputChange(feed.id, e.target.value)}
                    className={cn(
                      "font-mono pr-24 bg-white",
                      index !== 0 &&
                        !feeds[index - 1].url &&
                        "opacity-50 cursor-not-allowed",
                      feed.status === "error" &&
                        "border-red-500 focus-visible:ring-red-500 text-red-500"
                    )}
                    disabled={index !== 0 && !feeds[index - 1].url}
                    aria-invalid={feed.status === "error"}
                    aria-errormessage={
                      feed.status === "error" ? `error-${feed.id}` : undefined
                    }
                  />
                  {feed.status === "success" &&
                    feed.postCount !== undefined && (
                      <div className="absolute inset-y-0 right-3 flex items-center">
                        <div className="bg-gray-200/90 backdrop-blur-sm text-black dark:bg-gray-700/90 dark:text-white text-[11px] font-sans font-medium px-2 h-[20px] flex items-center rounded-[8px] whitespace-nowrap">
                          {feed.postCount}
                        </div>
                      </div>
                    )}
                  {feed.status === "error" && (
                    <div
                      id={`error-${feed.id}`}
                      className="absolute inset-y-0 right-3 flex items-center text-sm text-red-500"
                      role="alert"
                    >
                      {feed.errorMessage}
                    </div>
                  )}
                </div>
                {feed.url && (
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                      feed.status === "error"
                        ? "bg-red-500"
                        : "bg-black dark:bg-white"
                    )}
                  >
                    {feed.status === "loading" ? (
                      <Loader2 className="w-4 h-4 text-white dark:text-black animate-spin" />
                    ) : feed.status === "success" ? (
                      <Check className="w-4 h-4 text-white dark:text-black" />
                    ) : feed.status === "error" ? (
                      <X className="w-4 h-4 text-white" />
                    ) : (
                      <ArrowDown className="w-4 h-4 text-white dark:text-black" />
                    )}
                  </div>
                )}
              </div>
            ))}
            <div className="relative flex items-center gap-4 mb-2">
              <div className="relative flex-grow">
                <Input
                  type="url"
                  placeholder="Enter RSS feed URL"
                  value={newFeedUrl}
                  onChange={(e) => setNewFeedUrl(e.target.value)}
                  className="font-mono pr-24 bg-white"
                />
              </div>
              <Button
                onClick={() => {
                  if (newFeedUrl.trim()) {
                    setFeeds((current) => [
                      ...current,
                      {
                        id: String(current.length + 1),
                        url: newFeedUrl,
                        status: "idle",
                      },
                    ]);
                    setNewFeedUrl("");
                  }
                }}
                className="text-sm hover:bg-blue-500"
              >
                Add Feed
              </Button>
            </div>
            <div className="flex justify-end mt-4">
              <Button
                onClick={() => setIsModalOpen(false)}
                className="text-sm hover:bg-blue-500"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
