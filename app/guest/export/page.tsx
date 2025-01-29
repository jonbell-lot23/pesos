"use client";

"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface FeedItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  content?: string;
}

export default function ExportPage() {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const feedUrls = urlParams.getAll("feedUrls");
    fetchFeedData(feedUrls);
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

  return (
    <div className="w-full flex justify-between items-center">
      <div className="flex min-h-screen w-full flex-col p-8">
        <div className="flex justify-center items-center mb-4">
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
    </div>
  );
}
