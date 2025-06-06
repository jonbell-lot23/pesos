"use client";

import React, { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, ArrowDown, Check, X } from "lucide-react";
import { validateRSSFeed } from "@/app/actions";

export interface FeedEntry {
  id: string;
  url: string;
  status: "idle" | "loading" | "success" | "error";
  errorMessage?: string;
  postCount?: number;
}

interface FeedEditorProps {
  /**
   * Optionally pass an initial list of feed entries.
   */
  initialFeeds?: FeedEntry[];
  /**
   * Called when the user clicks Continue—
   * returns only the feeds that were successfully validated.
   */
  onContinue: (feeds: FeedEntry[]) => void;
}

export default function FeedEditor({
  initialFeeds,
  onContinue,
}: FeedEditorProps) {
  const [feeds, setFeeds] = useState<FeedEntry[]>(
    initialFeeds && initialFeeds.length > 0
      ? [
          ...initialFeeds,
          { id: String(initialFeeds.length + 1), url: "", status: "idle" },
        ]
      : [{ id: "1", url: "", status: "idle" }]
  );
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isAnyFeedLoaded = feeds.some((feed) => feed.status === "success");

  const handleInputChange = (id: string, value: string) => {
    setFeeds((current) =>
      current.map((feed) =>
        feed.id === id
          ? {
              ...feed,
              url: value,
              status: "idle",
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
        feed.id === id ? { ...feed, status: "loading" } : feed
      )
    );

    try {
      const result = await validateRSSFeed(value);
      if (result.success) {
        setFeeds((current) => {
          const updatedFeed: FeedEntry = {
            ...current.find((f) => f.id === id)!,
            status: "success",
            url: result.feedUrl || value,
            postCount: result.postCount,
          };

          // Check if we need to add a new empty field
          const needsNewField = current[current.length - 1].id === id;

          let newFeeds = current.map((feed) =>
            feed.id === id ? updatedFeed : feed
          );

          if (needsNewField) {
            newFeeds = [
              ...newFeeds,
              { id: String(current.length + 1), url: "", status: "idle" },
            ];
          }

          return newFeeds;
        });
      } else {
        setFeeds((current) =>
          current.map((feed) =>
            feed.id === id
              ? { ...feed, status: "error", errorMessage: result.error }
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
                status: "error",
                errorMessage: "Failed to validate feed",
              }
            : feed
        )
      );
    }
  };

  const handleContinue = () => {
    // Return only feeds that are valid (nonempty and successfully validated)
    const validFeeds = feeds.filter(
      (feed) => feed.url.trim() !== "" && feed.status === "success"
    );
    onContinue(validFeeds);
  };

  return (
    <div className="space-y-3">
      {feeds.map((feed, index) => (
        <div key={feed.id} className="relative flex items-center">
          <div className="relative flex-grow">
            <Input
              type="url"
              placeholder="Add a project"
              value={feed.url}
              onChange={(e) => handleInputChange(feed.id, e.target.value)}
              className={cn(
                "font-mono pr-24",
                feed.status === "error" &&
                  "border-red-500 focus-visible:ring-red-500 text-red-500"
              )}
              aria-invalid={feed.status === "error"}
              aria-errormessage={
                feed.status === "error" ? `error-${feed.id}` : undefined
              }
            />
            <div className="absolute inset-y-0 right-3 flex items-center">
              {feed.status === "loading" ? (
                <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
              ) : feed.status === "success" && feed.postCount !== undefined ? (
                <div className="bg-gray-200/90 backdrop-blur-sm text-black dark:bg-gray-700/90 dark:text-white text-[11px] font-sans font-medium px-2 h-[20px] flex items-center rounded-[8px] whitespace-nowrap">
                  {feed.postCount}
                </div>
              ) : feed.status === "error" ? (
                <span className="text-sm text-red-500">
                  {feed.errorMessage}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ))}
      <div>
        <Button
          onClick={handleContinue}
          className="w-full bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-700"
          disabled={!isAnyFeedLoaded}
        >
          Continue →
        </Button>
      </div>
    </div>
  );
}
