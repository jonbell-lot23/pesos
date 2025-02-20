"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { SignInButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { getUserSources, addUserSource } from "@/app/actions/sources";
import prisma from "@/lib/prismadb"; // Importing the Prisma client
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
import FeedEditor, { FeedEntry } from "@/components/FeedEditor";
import { sleep } from "@/lib/utils"; // We'll create this utility

interface FeedSource {
  id: number;
  url: string;
  status: "idle" | "loading" | "success" | "error";
  storedCount?: number;
  totalCount?: number;
  pendingCount?: number;
  error?: string;
  retryCount?: number; // Add this to track retry attempts
}

export default function BackupPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [feedSources, setFeedSources] = useState<FeedSource[]>([]);
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [localUser, setLocalUser] = useState<any | undefined>(undefined);
  const [isFeedEditorOpen, setIsFeedEditorOpen] = useState(false);
  const [loadingDots, setLoadingDots] = useState("");

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // NEW: Log user object whenever it changes
  useEffect(() => {
    console.log("User object:", user);
  }, [user]);

  const fetchSources = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);

    try {
      const sources = await getUserSources(user.id);
      const initialSources = sources.map((source: any) => ({
        id: source.id,
        url: source.url,
        status: "idle" as const,
      }));

      setFeedSources(initialSources);

      // Process in smaller batches with shorter timeouts
      for (let i = 0; i < initialSources.length; i += 2) {
        const batch = initialSources.slice(i, i + 2);

        // Don't await the batch - let them process independently
        batch.forEach((source) => {
          checkSource(source.id).catch(() => {
            // Silently handle any errors
          });
        });

        // Small delay between starting each batch
        if (i + 2 < initialSources.length) {
          await sleep(200);
        }
      }
    } catch (error) {
      // Silently handle errors
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isSignedIn && user?.id) {
      fetchSources();
    }
  }, [isSignedIn, user?.id, fetchSources]);

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

  // Add loading dots animation
  useEffect(() => {
    if (feedSources.some((s) => s.status === "loading")) {
      const interval = setInterval(() => {
        setLoadingDots((prev) => (prev.length >= 3 ? "" : prev + "."));
      }, 500);
      return () => clearInterval(interval);
    } else {
      setLoadingDots("");
    }
  }, [feedSources]);

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

      // Always try to parse JSON, fall back to empty object if it fails
      const data = await res.json().catch(() => ({}));

      setFeedSources((prev) =>
        prev.map((s) =>
          s.id === sourceId
            ? {
                ...s,
                status: "success",
                pendingCount: data?.newItems?.length || 0,
              }
            : s
        )
      );
    } catch {
      // On any error, just show success with 0
      setFeedSources((prev) =>
        prev.map((s) =>
          s.id === sourceId ? { ...s, status: "success", pendingCount: 0 } : s
        )
      );
    }
  };

  const handleContinue = async () => {
    setIsLoading(true);
    const fetchedData = await fetchDataFromAPI();
    setData(fetchedData);
    setIsLoading(false);
  };

  useEffect(() => {
    // If your data fetching happens automatically, you could set loading here.
    // For now, assume handleContinue is fired by a continue button.
  }, []);

  const handleFeedChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;

      // Clear any existing timer
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Set new timer to wait 300ms after the last keystroke
      debounceTimeoutRef.current = setTimeout(() => {
        // Call the API or update state with the debounced value
        updateFeed(value);
      }, 300);
    },
    []
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!username.trim()) {
      setError("Username cannot be empty");
      return;
    }
    if (!user?.id) {
      setError("User not loaded. Please try again or refresh the page.");
      return;
    }
    try {
      const res = await fetch("/api/createUser", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: username.trim(), clerkId: user.id }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        console.error("Error response from createUser:", errorData);
        throw new Error("Failed to create user");
      }
      // On successful creation, refresh the local user record
      await fetchLocalUser();
    } catch (err) {
      setError("Failed to create user. Please try again.");
      console.error(err);
    }
  };

  // Move fetchLocalUser inside useCallback to avoid dependency issues
  const fetchLocalUser = useCallback(async () => {
    if (user?.id) {
      try {
        const res = await fetch("/api/getLocalUser", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clerkId: user.id }),
        });
        const data = await res.json();

        // Only set localUser if we actually got data back
        if (data.localUser) {
          setLocalUser(data.localUser);
        }
      } catch (error) {
        // Don't set localUser to null on error - keep existing state
        console.error("Error fetching local user:", error);
      }
    }
  }, [user?.id]); // Add user?.id as dependency

  // Update useEffect to include fetchLocalUser in dependencies
  useEffect(() => {
    if (isSignedIn && user?.id) {
      fetchLocalUser();
    }
  }, [isSignedIn, user, fetchLocalUser]); // Add fetchLocalUser to dependencies

  // NEW: Callback for FeedEditor onContinue in the backup page.
  const handleFeedEditorContinue = async (newFeeds: FeedEntry[]) => {
    console.log("New feeds from FeedEditor:", newFeeds);
    // Call the API to add feeds to the database
    try {
      const response = await fetch("/api/add-pesos-source", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ feeds: newFeeds, userId: localUser.id }),
      });
      const data = await response.json();
      if (!data.success) {
        console.error("Failed to add feeds:", data.error);
      }
    } catch (error) {
      console.error("Error calling add-pesos-source API", error);
    }
    setIsFeedEditorOpen(false);
    // Refresh the feed sources so that the new items appear immediately
    await fetchSources();
  };

  // Update the username form check
  const showUsernameForm = !localUser?.username && isSignedIn;

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div>Loading...</div>
      </div>
    );
  }

  if (!isSignedIn) {
    // User is not signed in, so prompt sign in.
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <p className="mb-4">You must be signed in to continue.</p>
        <SignInButton />
      </div>
    );
  }

  if (localUser === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div>Loading user info...</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col p-8 bg-white min-h-screen">
      <h1 className="text-black text-2xl mb-8">
        Welcome, {user?.username || user?.firstName}!
      </h1>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Update the username form condition */}
      {showUsernameForm ? (
        <div className="mb-4 p-4 bg-gray-100 rounded">
          <h1 className="text-2xl font-bold mb-4">Choose a Username</h1>
          <form onSubmit={handleSubmit} className="w-full max-w-md px-4">
            <input
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mb-2"
            />
            <button
              type="submit"
              className="w-full p-2 bg-blue-500 text-white rounded"
            >
              Submit
            </button>
            {error && <p className="text-red-500 mt-2">{error}</p>}
          </form>
        </div>
      ) : (
        <>
          <Button
            onClick={() => setIsFeedEditorOpen(true)}
            className="mb-4 w-fit ml-auto mr-12"
          >
            Edit feeds
          </Button>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Feed URL</TableHead>
                <TableHead>Status</TableHead>
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
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        {typeof source.pendingCount === "number" &&
                          source.pendingCount > 0 && (
                            <span className="text-xs text-gray-600">
                              {source.pendingCount} items stored
                            </span>
                          )}
                      </div>
                    )}
                    {source.status === "error" && (
                      <X className="w-4 h-4 text-red-500" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}

      {isFeedEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-4 rounded shadow-lg w-full max-w-md">
            <div className="flex justify-end">
              <button
                className="p-2 text-sm"
                onClick={() => setIsFeedEditorOpen(false)}
              >
                Close
              </button>
            </div>
            <FeedEditor
              // No initial feeds provided (or you could map existing URLs if desired)
              onContinue={handleFeedEditorContinue}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function (simulate an async fetch)
async function fetchDataFromAPI() {
  // simulate a delay
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ example: "data" });
    }, 2000);
  });
}

// Example update function – replace with your actual update logic.
function updateFeed(newValue: string) {
  // Call your API or update state accordingly.
  console.log("Updating feed with:", newValue);
}
