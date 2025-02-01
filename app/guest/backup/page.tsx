"use client";

import { useCallback, useEffect, useState } from "react";
import { SignInButton, useAuth, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { getUserSources, addUserSource } from "@/app/actions/sources";
import { prisma } from "@/lib/prisma"; // Importing the Prisma client
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

  const fetchSources = useCallback(async () => {
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

      // Fetch posts for each source
      for (const source of sources) {
        try {
          const postsResponse = await fetch(
            `/api/fetch-posts?sourceId=${source.id}`
          );

          if (!postsResponse.ok) {
            throw new Error(`Failed to fetch posts for sourceId ${source.id}`);
          }

          const posts = await postsResponse.json();
          console.log(`Posts for source ${source.id}:`, posts);
        } catch (err) {
          console.error(`Error fetching posts for source ${source.id}:`, err);
        }
      }
    } catch (error) {
      console.error("Error fetching sources:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]); // ✅ Ensures useCallback only updates when user.id changes

  useEffect(() => {
    if (isSignedIn && user?.id) {
      fetchSources();
    }
  }, [isSignedIn, user?.id, fetchSources]);

  useEffect(() => {
    if (isSignedIn && user?.id) {
      fetchSources();
    }
  }, [isSignedIn, user?.id, fetchSources]); // ✅ No infinite loop

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
    setFeedSources((prev) =>
      prev.map((s) => (s.id === sourceId ? { ...s, status: "loading" } : s))
    );

    try {
      const res = await fetch("/api/check-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId }),
      });

      if (!res.ok) throw new Error("Failed to check source");

      const { newItems } = await res.json();

      setFeedSources((prev) =>
        prev.map((s) =>
          s.id === sourceId
            ? { ...s, status: "success", storedCount: newItems.length }
            : s
        )
      );
    } catch (error) {
      setFeedSources((prev) =>
        prev.map((s) =>
          s.id === sourceId
            ? { ...s, status: "error", error: error.message }
            : s
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
