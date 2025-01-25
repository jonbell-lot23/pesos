"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function FeedSelection() {
  const [feeds, setFeeds] = useState([""]);
  const router = useRouter();

  const addFeed = () => {
    setFeeds([...feeds, ""]);
  };

  const updateFeed = (index: number, value: string) => {
    const newFeeds = [...feeds];
    newFeeds[index] = value;
    setFeeds(newFeeds);
  };

  const removeFeed = (index: number) => {
    const newFeeds = feeds.filter((_, i) => i !== index);
    setFeeds(newFeeds);
  };

  const handleContinue = async () => {
    const validFeeds = feeds.filter((feed) => feed !== "");

    // Save each feed to the backend
    for (const feedUrl of validFeeds) {
      try {
        await fetch("/api/sources", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: feedUrl }),
        });
      } catch (error) {
        console.error("Error saving feed:", error);
      }
    }

    // Store in localStorage as backup
    localStorage.setItem("feeds", JSON.stringify(validFeeds));

    // Redirect to feed-display with db-view tab
    router.push("/feed-display?tab=db-view");
  };

  return (
    <div className="container mx-auto p-4 w-full max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Add Your RSS Feeds</h1>
      {feeds.map((feed, index) => (
        <div key={index} className="flex items-center space-x-2 mb-4">
          <Input
            type="url"
            placeholder="Enter RSS feed URL"
            value={feed}
            onChange={(e) => updateFeed(index, e.target.value)}
            className="flex-grow"
          />
          <Button variant="secondary" onClick={() => removeFeed(index)}>
            Remove
          </Button>
        </div>
      ))}
      <Button onClick={addFeed} className="mt-4 mb-8">
        Add Another Feed
      </Button>
      <Button onClick={handleContinue} className="w-full">
        Continue
      </Button>
    </div>
  );
}
