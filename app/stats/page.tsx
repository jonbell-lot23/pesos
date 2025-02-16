"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Spinner from "@/components/Spinner";
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

interface FeedItem {
  title: string;
  link: string;
  pubDate: string;
  source?: string;
  content?: string;
}

export default function StatsPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localUser, setLocalUser] = useState<any>(null);

  // First get the local user data
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id) {
      if (isLoaded && !isSignedIn) {
        router.push("/");
      }
      return;
    }

    async function getLocalUser() {
      try {
        const response = await fetch("/api/getLocalUser", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clerkId: user!.id }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch local user");
        }

        const data = await response.json();
        if (data.localUser) {
          setLocalUser(data.localUser);
        }
      } catch (error) {
        console.error("Error fetching local user:", error);
        setError("Failed to load user data");
      }
    }

    getLocalUser();
  }, [isLoaded, isSignedIn, user?.id, router]);

  // Then load the stats data once we have the local user
  useEffect(() => {
    if (!localUser?.username) return;

    async function loadData() {
      try {
        const payload = {
          clerkId: user!.id,
          username: localUser.username,
        };

        const res = await fetch("/api/get-posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error("Failed to fetch data");
        }

        const data = await res.json();
        if (data.posts) {
          const items = data.posts.map((post: any) => ({
            title: post.title,
            link: post.url,
            pubDate: post.postdate,
            source: post.sourceUrl,
            content: post.description,
          }));

          setFeedItems(
            items.sort(
              (a: FeedItem, b: FeedItem) =>
                new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
            )
          );
        } else {
          setError("No posts found");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load posts");
      } finally {
        setIsLoadingData(false);
      }
    }

    loadData();
  }, [localUser?.username, user?.id]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Spinner />
      </div>
    );
  }

  if (isLoadingData) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="text-red-500 mb-4">{error}</div>
        <Button
          onClick={() => window.location.reload()}
          className="text-sm hover:bg-blue-500"
        >
          Retry
        </Button>
      </div>
    );
  }

  const metrics = calculateMetrics(feedItems);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Database Stats</h1>
      <MetricsDisplay {...metrics} />
      <div className="flex justify-center items-center my-8">
        <Button
          onClick={() => {
            const dataStr =
              "data:text/json;charset=utf-8," +
              encodeURIComponent(JSON.stringify(feedItems));
            const downloadAnchorNode = document.createElement("a");
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "feeds_export.json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
          }}
          className="text-sm hover:bg-blue-500"
        >
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
  );
}
