"use client";

import { useEffect, useState } from "react";
import { validateRSSFeed } from "@/app/actions";
import { getUserSources } from "@/app/actions/sources";
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
import { Loader2, ArrowDown, Check, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { SignInButton, useUser } from "@clerk/nextjs";
import FeedEditor, { FeedEntry } from "@/components/FeedEditor";
import Spinner from "../../../components/Spinner";

interface FeedItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  content?: string;
}

export default function ExportPage() {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded, isSignedIn, user } = useUser();

  // NEW: Delay rendering until component is mounted to prevent flashing of the sign-in screen.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    async function loadFeeds() {
      if (!searchParams) {
        setIsLoadingData(false);
        return;
      }
      const qs = searchParams.getAll("feedUrls");
      if (qs.length === 0) {
        if (!isSignedIn) {
          router.replace("/");
          return;
        } else if (user?.id) {
          // Fetch saved sources from the DB for logged in users
          try {
            const sources = await getUserSources(user.id);
            console.log("Fetched user sources:", sources);
            if (sources && sources.length > 0) {
              const urls = sources.map((source: any) => source.url);
              const queryString = urls
                .map((url: string) => `feedUrls=${encodeURIComponent(url)}`)
                .join("&");
              // Update the URL with the DB-sourced feed URLs
              window.history.replaceState(null, "", `?${queryString}`);
              await fetchFeedData(urls);
            }
          } catch (err) {
            console.error("Error fetching user sources:", err);
          } finally {
            setIsLoadingData(false);
          }
        }
      } else {
        await fetchFeedData(qs);
        setIsLoadingData(false);
      }
    }
    loadFeeds();
  }, [mounted, searchParams, isSignedIn, user?.id, router]);

  if (!mounted) return null;

  const fetchFeedData = async (feedUrls: string[]) => {
    try {
      const response = await fetch("/api/fetch-feeds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sources: feedUrls }),
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

  const handleFeedEditorContinue = (newFeeds: FeedEntry[]) => {
    const newFeedUrls = newFeeds.map((feed) => feed.url);
    const queryString = newFeedUrls
      .map((url) => `feedUrls=${encodeURIComponent(url)}`)
      .join("&");
    window.history.replaceState(null, "", `?${queryString}`);
    fetchFeedData(newFeedUrls);
    setIsModalOpen(false);
  };

  const metrics = calculateMetrics(feedItems);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Spinner />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
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

  const feedUrls = searchParams?.getAll("feedUrls") ?? [];
  const initialFeeds: FeedEntry[] = feedUrls.map((url, index) => ({
    id: String(index + 1),
    url,
    status: "idle",
  }));

  if (feedItems.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <Button
          onClick={() => setIsModalOpen(true)}
          className="text-sm hover:bg-blue-500"
        >
          Add your first feed
        </Button>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white p-4 rounded shadow-lg w-full max-w-md">
              <div className="flex justify-end">
                <button
                  className="p-2 text-sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  Close
                </button>
              </div>
              <FeedEditor
                initialFeeds={initialFeeds}
                onContinue={handleFeedEditorContinue}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-4 rounded shadow-lg w-full max-w-md">
            <div className="flex justify-end">
              <button
                className="p-2 text-sm"
                onClick={() => setIsModalOpen(false)}
              >
                Close
              </button>
            </div>
            <FeedEditor
              initialFeeds={initialFeeds}
              onContinue={handleFeedEditorContinue}
            />
          </div>
        </div>
      )}
    </div>
  );
}
