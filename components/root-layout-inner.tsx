"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "./ui/button";
import {
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import { NextFont } from "next/dist/compiled/@next/font";
import { usePathname } from "next/navigation";
import UsernameModal from "./username-modal";
import DBErrorScreen from "./db-error-screen";
import { Settings, Download, Loader2 } from "lucide-react";
import NavBar from "./NavBar";
import FeedEditor from "@/components/FeedEditor";

interface FeedEntry {
  id: string;
  url: string;
  status: "success" | "error" | "loading" | "idle";
}

interface RootLayoutInnerProps {
  children: React.ReactNode;
  inter: NextFont;
}

export function RootLayoutInner({ children, inter }: RootLayoutInnerProps) {
  const { user } = useUser();
  const pathname = usePathname();
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [isCheckingUser, setIsCheckingUser] = useState(true);
  const [hideHeader, setHideHeader] = useState(false);
  const [dbError, setDbError] = useState(false);
  const [showFeedEditor, setShowFeedEditor] = useState(false);
  const [feeds, setFeeds] = useState<FeedEntry[]>([]);
  const [feedEditorError, setFeedEditorError] = useState<string | null>(null);
  const [isSavingFeeds, setIsSavingFeeds] = useState(false);
  const [loadingDots, setLoadingDots] = useState("");

  // Determine if we're on the landing page
  const isLandingPage = pathname === "/";

  let computedUsername = "";
  if (user) {
    if (
      user.publicMetadata &&
      typeof user.publicMetadata.username === "string" &&
      user.publicMetadata.username.trim() !== ""
    ) {
      computedUsername = user.publicMetadata.username;
    } else if (user.firstName) {
      computedUsername = user.firstName;
    } else if (user.fullName) {
      computedUsername = user.fullName.split(" ")[0];
    } else if (user.username && !user.username.startsWith("user_")) {
      computedUsername = user.username;
    } else {
      computedUsername = user.id || "";
    }
  }
  const username = computedUsername.toLowerCase();

  const [localUser, setLocalUser] = useState<any>(null);

  // Load feeds function
  const loadFeeds = useCallback(async () => {
    try {
      const response = await fetch("/api/sources");
      if (!response.ok) throw new Error("Failed to load feeds");
      const data = await response.json();
      const existingFeeds: FeedEntry[] = data.sources.map((source: any) => ({
        id: source.id.toString(),
        url: source.url,
        status: "success" as const,
      }));
      setFeeds(existingFeeds);
    } catch (error) {
      console.error("Error loading feeds:", error);
    }
  }, []);

  const handleEditFeeds = async () => {
    await loadFeeds();
    setShowFeedEditor(true);
  };

  useEffect(() => {
    if (isSavingFeeds) {
      const interval = setInterval(() => {
        setLoadingDots((dots) => (dots.length >= 3 ? "" : dots + "."));
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isSavingFeeds]);

  const handleFeedEditorContinue = async (newFeeds: FeedEntry[]) => {
    setFeedEditorError(null);
    setIsSavingFeeds(true);

    try {
      // First save all the feeds
      for (const feed of newFeeds) {
        const response = await fetch("/api/sources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: feed.url }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || `Failed to save feed: ${feed.url}`
          );
        }
      }

      // Now trigger immediate scraping and wait for completion
      const scrapeResponse = await fetch("/api/scrape-all", {
        method: "POST",
      });

      const scrapeData = await scrapeResponse.json();

      if (!scrapeResponse.ok || !scrapeData.success) {
        throw new Error(
          scrapeData.error ||
            scrapeData.errors?.join("\n") ||
            "Failed to scrape feeds"
        );
      }

      // If we have any errors but some successes, show a warning but continue
      if (scrapeData.errors?.length) {
        console.warn("Some feeds failed to scrape:", scrapeData.errors);
      }

      // Only redirect after scraping is complete
      window.location.href = "/dashboard/simple";
    } catch (error) {
      console.error("Error saving/scraping feeds:", error);
      setFeedEditorError(
        error instanceof Error ? error.message : "Failed to save feeds"
      );
      setIsSavingFeeds(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const checkLocalUser = async () => {
      if (!user) {
        setIsCheckingUser(false);
        setShowUsernameModal(false);
        setLocalUser(null);
        return;
      }

      try {
        const response = await fetch("/api/getLocalUser", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clerkId: user.id }),
        });

        if (!isMounted) return;

        if (!response.ok) {
          console.error("Error fetching local user:", response.statusText);
          // Check if it's a database error (500 status)
          if (response.status === 500) {
            const errorData = await response.json();
            if (
              errorData.error?.includes("database") ||
              errorData.error?.includes("prisma")
            ) {
              setDbError(true);
            }
          }
          setIsCheckingUser(false);
          return;
        }

        const data = await response.json();

        if (data.localUser) {
          setLocalUser(data.localUser);
          setShowUsernameModal(false);
        } else if (pathname && !pathname.startsWith("/post/")) {
          setShowUsernameModal(true);
          setLocalUser(null);
        }
      } catch (error) {
        console.error("Error checking local user:", error);
        // Check if it's a database error
        if (
          error instanceof Error &&
          (error.message.includes("database") ||
            error.message.includes("prisma"))
        ) {
          setDbError(true);
        }
      } finally {
        if (isMounted) {
          setIsCheckingUser(false);
        }
      }
    };

    setIsCheckingUser(true);
    checkLocalUser();

    return () => {
      isMounted = false;
    };
  }, [user, pathname]);

  // If there's a database error, show the error screen
  if (dbError) {
    return <DBErrorScreen />;
  }

  // Don't show the username modal while we're still checking or if not signed in
  const shouldShowUsernameModal =
    showUsernameModal && !isCheckingUser && user !== null;

  return (
    <div
      className={`${inter.className} min-h-screen flex flex-col ${
        isLandingPage ? "bg-white" : "bg-[#FAFAFA]"
      }`}
    >
      {!hideHeader && (
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div>
                <SignedIn>
                  <Link href="/dashboard">
                    <h1 className="text-2xl font-bold text-gray-900 hover:text-gray-700">
                      PESOS
                    </h1>
                  </Link>
                </SignedIn>
                <SignedOut>
                  <Link href="/">
                    <h1 className="text-2xl font-bold text-gray-900 hover:text-gray-700 no-underline">
                      PESOS
                    </h1>
                  </Link>
                </SignedOut>
              </div>
              <div className="flex items-center space-x-4">
                <NavBar />
                <SignedIn>
                  {pathname !== "/dashboard/all_posts" && (
                    <>
                      <button
                        onClick={() => handleEditFeeds()}
                        className="hidden md:block bg-black text-white p-2 rounded-full hover:opacity-80 transition-opacity"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const response = await fetch("/api/export");
                            if (!response.ok) {
                              const errorData = await response.json();
                              throw new Error(
                                errorData.error || "Failed to download backup"
                              );
                            }
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = "backup.json";
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                          } catch (error) {
                            console.error("Download error:", error);
                            alert(
                              "Failed to download backup: " +
                                (error instanceof Error
                                  ? error.message
                                  : "Unknown error")
                            );
                          }
                        }}
                        className="hidden md:block bg-black text-white p-2 rounded-full hover:opacity-80 transition-opacity"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <UserButton afterSignOutUrl="/" />
                </SignedIn>
                <SignedOut>
                  <SignInButton mode="modal">
                    <Button variant="outline">Log in</Button>
                  </SignInButton>
                </SignedOut>
              </div>
            </div>
          </div>
        </header>
      )}
      <main className="flex-grow relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {children}
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-center items-center">
          <p className="text-sm text-gray-700 text-center hidden">
            *Publish Elsewhere, Syndicate On (Your Own) Site. This helps when
            sites go down, turn fascist, or whatever the case may be.
          </p>
        </div>
      </main>
      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center"></div>
      </footer>
      {shouldShowUsernameModal && <UsernameModal />}
      {showFeedEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-3 sm:p-4 max-w-xl w-full mx-2 sm:mx-4 modal-content">
            {isSavingFeeds ? (
              <div className="py-8 text-center">
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto mb-3" />
                <p className="text-gray-600">
                  Backing up, this might take a minute{loadingDots}
                </p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h2 className="text-xl font-bold">Add your projects</h2>
                  </div>
                  <Button
                    onClick={() => setShowFeedEditor(false)}
                    variant="ghost"
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </Button>
                </div>
                {feedEditorError && (
                  <div className="mb-3 p-2 bg-red-100 border border-red-300 text-red-700 rounded">
                    {feedEditorError}
                  </div>
                )}
                <FeedEditor
                  initialFeeds={feeds}
                  onContinue={handleFeedEditorContinue}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
