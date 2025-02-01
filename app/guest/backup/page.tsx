"use client";

import { SignInButton, useAuth, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { getUserSources, addUserSource } from "@/app/actions/sources";
import { prisma } from "@/lib/prisma"; // Importing the Prisma client
import { fetchFeed, parseFeed } from "@/app/api/check-sources/route";
import { Loader2, Check, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface FeedSource {
  id: number;
  url: string;
  status: "idle" | "loading" | "success" | "error";
  storedCount?: number;
  totalCount?: number;
  error?: string;
}

export default function BackupPage() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [feedSources, setFeedSources] = useState<FeedSource[]>([]);
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isSignedIn && user?.id) {
      fetchSources();
    }
  }, [isSignedIn, user?.id]);

  const fetchSources = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const sources = await getUserSources(user.id);
      setFeedSources(
        sources.map((source: any) => ({
          id: source.id,
          url: source.url,
          status: "idle",
        }))
      );
      // Fetch and log posts for the source
      const postsResponse = await fetch(
        `/api/fetch-posts?sourceId=${sourceId}`
      );
      if (!postsResponse.ok) {
        throw new Error("Failed to fetch posts");
      }
      const posts = await postsResponse.json();
      posts.forEach((post: any) => console.log("Post:", post));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSource = async () => {
    if (user?.id && newSourceUrl) {
      setIsLoading(true);
      setError(null);
      try {
        const result = await addUserSource(user.id, newSourceUrl);
        if (result.success) {
          setFeedSources([
            ...feedSources,
            {
              id: result.source.id,
              url: result.source.url,
              status: "idle",
            },
          ]);
          setNewSourceUrl("");
        } else {
          setError(result.error);
        }
      } catch (error) {
        console.error("Error adding source:", error);
        setError("Failed to add source. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const checkSource = async (sourceId: number) => {
    console.log("Current feed sources:", feedSources); // Log all items to the console
    setFeedSources((current) =>
      current.map((source) =>
        source.id === sourceId ? { ...source, status: "loading" } : source
      )
    );

    try {
      const response = await fetch("/api/check-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId }),
      });

      if (!response.ok) {
        throw new Error("Failed to check source");
      }

      const data = await response.json();
      const feedItems = await fetchFeed(data.url); // Fetch the feed items
      const parsedItems = await parseFeed(feedItems); // Parse the feed items

      // Insert each item into the pesos_items table
      for (const item of parsedItems) {
        if (user) {
          // Check if user is defined
          await prisma.pesos_items.create({
            data: {
              title: item.title,
              url: item.link, // Assuming the link is in the item
              description: item.description,
              postdate: new Date(item.pubDate), // Assuming pubDate is in the item
              sourceId: data.sourceId, // Link to the source
              userId: user.id, // Assuming you want to link to the current user
            },
          });
        }
      }

      setFeedSources((current) =>
        current.map((source) =>
          source.id === sourceId
            ? {
                ...source,
                status: "success",
                storedCount: data.stored,
                totalCount: data.total,
              }
            : source
        )
      );
    } catch (error) {
      console.error("Error checking source:", error);
      setFeedSources((current) =>
        current.map((source) =>
          source.id === sourceId
            ? { ...source, status: "error", error: "Failed to check source" }
            : source
        )
      );
    }
  };

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h1 className="text-black text-2xl mb-4">Hello, please sign in!</h1>
        <SignInButton mode="modal">
          <Button className="text-sm hover:bg-blue-500">Sign In</Button>
        </SignInButton>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col p-8">
      <h1 className="text-black text-2xl mb-8">
        Welcome {user?.primaryEmailAddress?.emailAddress || user?.username}!
      </h1>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Feed URL</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Stored/Total</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {feedSources.map((source) => (
            <TableRow key={source.id}>
              <TableCell>{source.url}</TableCell>
              <TableCell>
                {source.status === "loading" && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                {source.status === "success" && (
                  <Check className="w-4 h-4 text-green-500" />
                )}
                {source.status === "error" && (
                  <X className="w-4 h-4 text-red-500" />
                )}
              </TableCell>
              <TableCell>
                {source.status === "success"
                  ? `${source.storedCount}/${source.totalCount}`
                  : "N/A"}
              </TableCell>
              <TableCell>
                <Button
                  onClick={() => checkSource(source.id)}
                  disabled={source.status === "loading"}
                >
                  Check
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
