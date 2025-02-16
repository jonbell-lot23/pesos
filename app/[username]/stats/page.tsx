"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
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
import Spinner from "../../../components/Spinner";

interface FeedItem {
  title: string;
  link: string;
  pubDate: string;
  source?: string;
  content?: string;
}

export default function StatsPage() {
  const params = useParams();
  const { username } = params;
  const routeUsername = Array.isArray(username) ? username[0] : username;
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isLoaded, isSignedIn, user } = useUser();

  useEffect(() => {
    async function loadData() {
      console.log("[StatsPage] Starting loadData");
      console.log("[StatsPage] User:", {
        id: user?.id,
        username: user?.username,
        publicMetadata: user?.publicMetadata,
      });
      console.log("[StatsPage] Route username:", routeUsername);

      try {
        const payload = {
          clerkId: user?.id,
          username: routeUsername,
        };
        console.log("[StatsPage] Sending payload:", payload);

        const response = await fetch("/api/get-posts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        console.log("[StatsPage] Response status:", response.status);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("[StatsPage] Received data:", data);

        if (data.error) {
          setError(
            data.error === "username_mismatch"
              ? "Username mismatch. Please check your URL."
              : "Failed to load posts."
          );
          return;
        }

        if (data.posts) {
          const items = data.posts.map((post: any) => ({
            title: post.title,
            link: post.url,
            pubDate: post.postdate,
            source: post.sourceUrl,
            content: post.description,
          }));

          console.log("[StatsPage] Processed items:", items.length);

          setFeedItems(
            items.sort(
              (a: FeedItem, b: FeedItem) =>
                new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
            )
          );
        } else {
          console.warn("[StatsPage] No posts in response data");
          setError("No posts found");
        }
      } catch (error) {
        console.error("[StatsPage] Error fetching data:", error);
        setError("Failed to load posts");
      } finally {
        setIsLoadingData(false);
        console.log("[StatsPage] Finished loading data");
      }
    }

    if (isSignedIn && user?.id) {
      loadData();
    }
  }, [isSignedIn, user?.id, routeUsername]);

  const metrics = calculateMetrics(feedItems);

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
