"use client";

import React, { useEffect, useState } from "react";
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

interface RootLayoutInnerProps {
  children: React.ReactNode;
  inter: NextFont;
}

export function RootLayoutInner({ children, inter }: RootLayoutInnerProps) {
  const { user } = useUser();
  const pathname = usePathname();
  const hideHeader = pathname.startsWith("/post/");
  const [dbError, setDbError] = useState(false);

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
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [isCheckingUser, setIsCheckingUser] = useState(true);

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
        } else if (pathname !== "/" && !pathname.startsWith("/post/")) {
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
      className={`${inter.className} min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 flex flex-col`}
    >
      {!hideHeader && (
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              PESOS<sup className="text-md text-blue-500">*</sup>
            </h1>
            <div className="flex items-center space-x-4">
              <SignedIn>
                <div className="mr-4 flex space-x-4">
                  <Link href="/export">
                    <h2>Export</h2>
                  </Link>
                  <Link href="/stats">
                    <h2>Stats</h2>
                  </Link>
                  <Link href="/backup">
                    <h2>Backup</h2>
                  </Link>
                  <Link href={`/${localUser?.username || username}/feed`}>
                    <h2>Feed</h2>
                  </Link>
                </div>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <Button variant="outline">Log in</Button>
                </SignInButton>
              </SignedOut>
            </div>
          </div>
        </header>
      )}
      <main className="flex-grow relative">
        {children}
        <div className="border-green-700 max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-center items-center">
          <p className="text-sm text-gray-700 text-center">
            *Publish Elsewhere, Syndicate On (Your Own) Site. This helps when
            sites go down, turn fascist, or whatever the case may be.
          </p>
        </div>
      </main>
      {shouldShowUsernameModal && <UsernameModal />}
    </div>
  );
}
