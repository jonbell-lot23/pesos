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

interface RootLayoutInnerProps {
  children: React.ReactNode;
  inter: NextFont;
}

export function RootLayoutInner({ children, inter }: RootLayoutInnerProps) {
  const { user } = useUser();
  const pathname = usePathname();
  const hideHeader = pathname.startsWith("/post/");

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

  const [showUsernameModal, setShowUsernameModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetch("/api/getLocalUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clerkId: user.id }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (!data.localUser) {
            setShowUsernameModal(true);
          } else {
            setShowUsernameModal(false);
          }
        })
        .catch((error) => {
          console.error("Error fetching local user:", error);
          setShowUsernameModal(true);
        });
    }
  }, [user, pathname]);

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
            {user ? (
              <div className="flex items-center space-x-4">
                <div className="mr-4 flex space-x-4">
                  <Link href="/guest/export">
                    <h2>Export</h2>
                  </Link>
                  <Link href="/guest/backup">
                    <h2>Backup</h2>
                  </Link>
                  <Link href={`/${username}/feed`}>
                    <h2>Feed</h2>
                  </Link>
                </div>
                <SignedIn>
                  <UserButton afterSignOutUrl="/" />
                </SignedIn>
                <SignedOut>
                  <SignInButton mode="modal">
                    <Button variant="outline">Sign In</Button>
                  </SignInButton>
                </SignedOut>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <SignedOut>
                  <SignInButton mode="modal">
                    <Button variant="outline">Sign In</Button>
                  </SignInButton>
                </SignedOut>
              </div>
            )}
          </div>
        </header>
      )}
      <main className="flex-grow relative">
        {children}
        <div className="border-green-700 max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <p className="text-sm text-gray-700">
            *Publish Elsewhere, Syndicate On (Your Own) Site. This helps when
            sites go down, turn fascist, or whatever the case may be.
          </p>
        </div>
      </main>
      {showUsernameModal && <UsernameModal />}
    </div>
  );
}
