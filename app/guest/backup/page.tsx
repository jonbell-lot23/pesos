"use client";

import { SignInButton, useAuth, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { getUserSources, addUserSource } from "@/app/actions/sources";
import { cn } from "@/lib/utils";
import { Loader2, ArrowDown, Check, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FeedEntry {
  id: number;
  url: string;
  status: "idle" | "loading" | "success" | "error";
  errorMessage?: string;
  postCount?: number;
  isExisting?: boolean;
}

export default function BackupPage() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [feeds, setFeeds] = useState<FeedEntry[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadExistingSources();
    }
  }, [user?.id]);

  const loadExistingSources = async () => {
    if (!user?.id) return;
    const sources = await getUserSources(user.id);
    setFeeds(
      sources.map((source) => ({
        id: source.id,
        url: source.url,
        status: "success",
        isExisting: true,
      }))
    );
  };

  const handleInputChange = async (id: number, value: string) => {
    setFeeds((current) =>
      current.map((feed) =>
        feed.id === id
          ? {
              ...feed,
              url: value,
              status: "idle" as const,
              errorMessage: undefined,
              postCount: undefined,
            }
          : feed
      )
    );

    if (value.trim()) {
      validateAndAddFeed(id, value);
    }
  };

  const validateAndAddFeed = async (id: number, value: string) => {
    if (!user?.id) return;

    setFeeds((current) =>
      current.map((feed) =>
        feed.id === id ? { ...feed, status: "loading" as const } : feed
      )
    );

    try {
      const result = await addUserSource(user.id, value);
      if (result.success) {
        setFeeds((current) =>
          current.map((feed) =>
            feed.id === id
              ? {
                  ...feed,
                  url: result.source.url,
                  status: "success" as const,
                }
              : feed
          )
        );
      } else {
        setFeeds((current) =>
          current.map((feed) =>
            feed.id === id
              ? {
                  ...feed,
                  status: "error" as const,
                  errorMessage: result.error,
                }
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
                status: "error" as const,
                errorMessage: "Failed to add feed",
              }
            : feed
        )
      );
    }
  };

  return (
    <div className="w-full flex justify-between items-center">
      <div className="flex min-h-screen w-full flex-col p-8">
        <div className="flex justify-center items-center my-8">
          <Button
            onClick={() => setIsModalOpen(true)}
            className="text-sm hover:bg-blue-500"
          >
            Add RSS Feed
          </Button>
        </div>
        {!isSignedIn ? (
          <div className="flex flex-col items-center justify-center h-full">
            <h1 className="text-black text-2xl mb-4">Hello, please sign in!</h1>
            <SignInButton mode="modal">
              <Button className="text-sm hover:bg-blue-500">Sign In</Button>
            </SignInButton>
          </div>
        ) : (
          <div className="flex flex-col w-full">
            <h1 className="text-black text-2xl mb-8">
              Welcome{" "}
              {user?.primaryEmailAddress?.emailAddress || user?.username}!
            </h1>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feed URL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feeds.map((feed) => (
                  <TableRow key={feed.id}>
                    <TableCell>{feed.url}</TableCell>
                    <TableCell>
                      {feed.isExisting ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : feed.status === "success" ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : feed.status === "error" ? (
                        <X className="w-4 h-4 text-red-500" />
                      ) : feed.status === "loading" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ArrowDown className="w-4 h-4" />
                      )}
                    </TableCell>
                    <TableCell>
                      {feed.isExisting ? "Previously Added" : "Just Now"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded shadow-lg w-1/2">
            <h2 className="text-xl font-bold mb-4">Add RSS Feed</h2>
            {feeds
              .filter((feed) => !feed.isExisting)
              .map((feed, index) => (
                <div
                  key={feed.id}
                  className="relative flex items-center gap-4 mb-2"
                >
                  <div className="relative flex-grow">
                    <Input
                      type="url"
                      placeholder="Enter RSS feed URL"
                      value={feed.url}
                      onChange={(e) =>
                        handleInputChange(feed.id, e.target.value)
                      }
                      className={cn(
                        "font-mono pr-24 bg-white",
                        index !== 0 &&
                          !feeds[index - 1].url &&
                          "opacity-50 cursor-not-allowed",
                        feed.status === "error" &&
                          "border-red-500 focus-visible:ring-red-500 text-red-500"
                      )}
                      disabled={index !== 0 && !feeds[index - 1].url}
                      aria-invalid={feed.status === "error"}
                      aria-errormessage={
                        feed.status === "error"
                          ? `error-${feed.id.toString()}`
                          : undefined
                      }
                    />
                    {feed.status === "error" && (
                      <div
                        id={`error-${feed.id.toString()}`}
                        className="absolute inset-y-0 right-3 flex items-center text-sm text-red-500"
                        role="alert"
                      >
                        {feed.errorMessage}
                      </div>
                    )}
                  </div>
                  {feed.url && (
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                        feed.status === "error"
                          ? "bg-red-500"
                          : "bg-black dark:bg-white"
                      )}
                    >
                      {feed.status === "loading" ? (
                        <Loader2 className="w-4 h-4 text-white dark:text-black animate-spin" />
                      ) : feed.status === "success" ? (
                        <Check className="w-4 h-4 text-white dark:text-black" />
                      ) : feed.status === "error" ? (
                        <X className="w-4 h-4 text-white" />
                      ) : (
                        <ArrowDown className="w-4 h-4 text-white dark:text-black" />
                      )}
                    </div>
                  )}
                </div>
              ))}
            <div className="relative flex items-center gap-4 mb-2">
              <div className="relative flex-grow">
                <Input
                  type="url"
                  placeholder="Enter RSS feed URL"
                  value=""
                  onChange={(e) =>
                    setFeeds((current) => [
                      ...current,
                      {
                        id: Date.now(),
                        url: e.target.value,
                        status: "idle",
                      },
                    ])
                  }
                  className="font-mono pr-24 bg-white"
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button
                onClick={() => setIsModalOpen(false)}
                className="text-sm hover:bg-blue-500"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
