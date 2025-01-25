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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

interface FeedItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  content?: string;
}

interface FeedSource {
  id: number;
  url: string;
  title: string;
  active: boolean;
}

interface FeedError {
  url: string;
  error: string;
}

export default function FeedDisplay() {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<FeedItem[]>([]);
  const [feedSources, setFeedSources] = useState<FeedSource[]>([]);
  const [feedErrors, setFeedErrors] = useState<FeedError[]>([]);
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { user, isSignedIn } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isSignedIn) {
      router.push("/");
      return;
    }
    fetchSources();
  }, [isSignedIn, user?.id]);

  useEffect(() => {
    if (feedSources.length > 0 && isLoading) {
      fetchFeedData(feedSources);
    }
  }, [feedSources]);

  useEffect(() => {
    filterItems();
  }, [feedItems, feedSources]);

  const fetchSources = async () => {
    try {
      const response = await fetch("/api/sources");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setFeedSources(
        data.sources.map((source: any) => ({
          id: source.id,
          url: source.url,
          title: new URL(source.url).hostname,
          active: true,
        }))
      );
    } catch (error) {
      console.error("Error fetching sources:", error);
      setFeedSources([]);
    }
  };

  const fetchFeedData = async (sources: FeedSource[]) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/fetch-feeds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sources: sources.map((s) => s.url) }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setFeedItems(data.items);
      setFeedSources((prevSources) =>
        prevSources.map((source) => ({
          ...source,
          title:
            data.sources.find((s: FeedSource) => s.url === source.url)?.title ||
            source.title,
        }))
      );
      setFeedErrors(data.errors || []);
    } catch (error) {
      console.error("Error fetching feed data:", error);
      setFeedItems([]);
      setFeedErrors([{ url: "all", error: String(error) }]);
    }
    setIsLoading(false);
  };

  const filterItems = () => {
    const activeSources = feedSources
      .filter((source) => source.active)
      .map((source) => source.title);
    setFilteredItems(
      feedItems.filter((item) => activeSources.includes(item.source))
    );
  };

  const toggleSource = (sourceId: number) => {
    const updatedSources = feedSources.map((source) =>
      source.id === sourceId ? { ...source, active: !source.active } : source
    );
    setFeedSources(updatedSources);
  };

  const addNewSource = async () => {
    if (newSourceUrl) {
      try {
        const response = await fetch("/api/sources", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: newSourceUrl }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setFeedSources([
          ...feedSources,
          {
            id: data.source.id,
            url: data.source.url,
            title: new URL(data.source.url).hostname,
            active: true,
          },
        ]);
        setNewSourceUrl("");
      } catch (error) {
        console.error("Error adding new source:", error);
        setFeedErrors([
          ...feedErrors,
          { url: newSourceUrl, error: String(error) },
        ]);
      }
    }
  };

  if (!isSignedIn) {
    return null;
  }

  return (
    <div className="container mx-auto p-4 w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Your PESOS* Feed</h1>
        <Link href="/profile">
          <Button>Profile</Button>
        </Link>
      </div>
      {feedErrors.length > 0 && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {feedErrors.map((error, index) => (
              <div key={index}>
                {error.url}: {error.error}
              </div>
            ))}
          </AlertDescription>
        </Alert>
      )}
      <Tabs
        defaultValue={
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("tab") ||
              "db-view"
            : "db-view"
        }
        className="w-full"
      >
        <TabsList>
          <TabsTrigger value="db-view">DB View</TabsTrigger>
          <TabsTrigger value="stream-view">Stream View</TabsTrigger>
          <TabsTrigger value="admin">Admin</TabsTrigger>
        </TabsList>
        <TabsContent value="db-view">
          <div className="flex">
            <div className="w-1/4 pr-4">
              <h2 className="text-xl font-bold mb-4">Feed Sources</h2>
              {feedSources.map((source) => (
                <div key={source.id} className="flex items-center mb-2">
                  <Checkbox
                    id={source.url}
                    checked={source.active}
                    onCheckedChange={() => toggleSource(source.id)}
                  />
                  <label htmlFor={source.url} className="ml-2">
                    {source.title}
                  </label>
                </div>
              ))}
              <div className="mt-4">
                <Input
                  type="url"
                  placeholder="Enter new RSS feed URL"
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  className="mb-2"
                />
                <Button onClick={addNewSource}>Add New Source</Button>
              </div>
            </div>
            <div className="w-3/4">
              {isLoading ? (
                <p>Loading feed data...</p>
              ) : filteredItems.length === 0 ? (
                <p>
                  No feed items available. Try adding or enabling some sources.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="flex items-center">
                            <Image
                              src={`https://www.google.com/s2/favicons?domain=${
                                new URL(item.link).hostname
                              }`}
                              alt={`${item.source} favicon`}
                              width={16}
                              height={16}
                              className="mr-2"
                            />
                            <span>{item.title}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(item.pubDate).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="stream-view">
          <div className="space-y-8">
            {filteredItems.map((item, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold mb-2">{item.title}</h2>
                <p className="text-gray-600 mb-4">
                  {item.source} - {new Date(item.pubDate).toLocaleDateString()}
                </p>
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: item.content || "" }}
                />
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline mt-4 inline-block"
                >
                  View original
                </a>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="admin">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">Admin Panel</h2>
            <p className="mb-4">
              This is a placeholder for the admin panel content.
            </p>
            <Button>Export Data</Button>
          </div>
        </TabsContent>
      </Tabs>
      <p className="text-sm mt-8 text-center">
        *Publish Elsewhere, Syndicate (to your) Own Site
      </p>
    </div>
  );
}
