"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { validateRSSFeed } from "@/app/actions";

export default function FeedSelection() {
  const [feeds, setFeeds] = useState([{ url: "", status: "idle", error: "" }]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const addFeed = () => {
    setFeeds([...feeds, { url: "", status: "idle", error: "" }]);
  };

  const updateFeed = async (index: number, value: string) => {
    const newFeeds = [...feeds];
    newFeeds[index] = { url: value, status: "loading", error: "" };
    setFeeds(newFeeds);

    try {
      // Validate and discover feed URL
      const result = await validateRSSFeed(value);

      if (result.success) {
        newFeeds[index] = {
          url: result.feedUrl || value,
          status: "success",
          error: "",
        };
      } else {
        newFeeds[index] = {
          url: value,
          status: "error",
          error: result.error,
        };
      }
    } catch (error) {
      newFeeds[index] = {
        url: value,
        status: "error",
        error: "Failed to validate feed",
      };
    }

    setFeeds(newFeeds);
  };

  const removeFeed = (index: number) => {
    const newFeeds = feeds.filter((_, i) => i !== index);
    setFeeds(newFeeds);
  };

  const handleContinue = async () => {
    setIsLoading(true);
    const validFeeds = feeds.filter((feed) => feed.status === "success");

    // Save each feed to the backend
    for (const feed of validFeeds) {
      try {
        await fetch("/api/sources", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: feed.url }),
        });
      } catch (error) {
        console.error("Error saving feed:", error);
      }
    }

    // Store in localStorage as backup
    localStorage.setItem("feeds", JSON.stringify(validFeeds.map((f) => f.url)));

    // Redirect to feed-display with db-view tab
    router.push("/feed-display?tab=db-view");
  };

  return (
    <div className="container mx-auto p-4 w-full max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Add Your RSS Feeds</h1>
      {feeds.map((feed, index) => (
        <div key={index} className="flex flex-col space-y-2 mb-4">
          <div className="flex items-center space-x-2">
            <Input
              type="url"
              placeholder="Enter RSS feed URL"
              value={feed.url}
              onChange={(e) => updateFeed(index, e.target.value)}
              className={`flex-grow ${
                feed.status === "error"
                  ? "border-red-500"
                  : feed.status === "success"
                  ? "border-green-500"
                  : ""
              }`}
            />
            <Button variant="secondary" onClick={() => removeFeed(index)}>
              Remove
            </Button>
          </div>
          {feed.status === "loading" && (
            <div className="text-sm text-gray-500">Checking feed...</div>
          )}
          {feed.error && (
            <div className="text-sm text-red-500">{feed.error}</div>
          )}
          {feed.status === "success" && (
            <div className="text-sm text-green-500">
              Feed validated successfully
            </div>
          )}
        </div>
      ))}
      <Button onClick={addFeed} className="mt-4 mb-8">
        Add Another Feed
      </Button>
      <Button
        onClick={handleContinue}
        className="w-full"
        disabled={isLoading || !feeds.some((f) => f.status === "success")}
      >
        {isLoading ? "Saving..." : "Continue"}
      </Button>
    </div>
  );
}
