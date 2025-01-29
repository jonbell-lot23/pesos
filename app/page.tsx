"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, ArrowDown, Check, X } from "lucide-react";
import { validateRSSFeed } from "@/app/actions";

interface FeedEntry {
  id: string;
  url: string;
  status: "idle" | "loading" | "success" | "error";
  errorMessage?: string;
  postCount?: number;
}

export default function Page() {
  const [feeds, setFeeds] = useState<FeedEntry[]>([
    { id: "1", url: "", status: "idle" },
  ]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isAnyFeedLoaded = feeds.some((feed) => feed.status === "success");

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

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (value.trim()) {
      timeoutRef.current = setTimeout(() => validateFeed(id, value), 500);
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
          const isLast = current[current.length - 1].id === id;
          const updatedFeed: FeedEntry = {
            ...current.find((f) => f.id === id)!,
            status: "success" as const,
            url: result.feedUrl || value,
            postCount: result.postCount,
          };

          return [
            ...current.map((feed) => (feed.id === id ? updatedFeed : feed)),
            ...(isLast
              ? [
                  {
                    id: String(current.length + 1),
                    url: "",
                    status: "idle" as const,
                  },
                ]
              : []),
          ];
        });
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

  const handleContinue = () => {
    const feedUrls = feeds
      .map((feed) => feed.url)
      .filter((url) => url.trim() !== "");
    const queryString = feedUrls
      .map((url) => `feedUrls=${encodeURIComponent(url)}`)
      .join("&");
    window.location.href = `/guest/export?${queryString}`;
  };

  return (
    <div className="flex min-h-screen flex-col items-center p-8">
      <header className="w-full max-w-2xl mb-12">
        <h1 className="font-mono text-2xl font-bold">PESOS*</h1>
        <p className="text-sm text-muted-foreground mt-2">
          A simple way to back up your RSS feeds so you control your own
          content.
        </p>
      </header>

      <main className="w-full max-w-2xl space-y-4">
        {feeds.map((feed, index) => (
          <div key={feed.id} className="relative flex items-center gap-4">
            <div className="relative flex-grow">
              <Input
                type="url"
                placeholder="Enter RSS feed URL"
                value={feed.url}
                onChange={(e) => handleInputChange(feed.id, e.target.value)}
                className={cn(
                  "font-mono pr-24",
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
              {feed.status === "success" && feed.postCount !== undefined && (
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
        <Button
          onClick={handleContinue}
          className="w-full bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-700"
          disabled={!isAnyFeedLoaded}
        >
          Continue →
        </Button>
      </main>

      <footer className="fixed bottom-4 text-center text-xs text-muted-foreground">
        *Publish Elsewhere, Syndicate On (Your Own) Site
      </footer>
    </div>
  );
}
