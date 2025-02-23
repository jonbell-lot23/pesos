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
import UsernameModal from "./username-modal";
import { NextFont } from "next/dist/compiled/@next/font";

interface RootLayoutInnerProps {
  children: React.ReactNode;
  inter: NextFont;
}

export function RootLayoutInnerComingSoon({
  children,
  inter,
}: RootLayoutInnerProps) {
  const { user, isLoaded } = useUser();
  const [showUsernameModal, setShowUsernameModal] = useState(false);

  useEffect(() => {
    if (!isLoaded) return; // wait until user data is loaded
    if (user) {
      // Fetch the local user record from the database
      fetch("/api/getLocalUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clerkId: user.id }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (!data.localUser) {
            // If no local user found, prompt the user to create one
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
  }, [isLoaded, user]);

  return (
    <div className={`${inter.className} min-h-screen bg-white flex flex-col`}>
      <header className="bg-white shadow-sm"></header>
      <main className="flex-grow">
        {children}
        {showUsernameModal && <UsernameModal />}
      </main>
    </div>
  );
}
