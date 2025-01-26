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

export function RootLayoutInner({ children, inter }: RootLayoutInnerProps) {
  const { user } = useUser();
  const [showUsernameModal, setShowUsernameModal] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      if (user?.id) {
        try {
          const response = await fetch(`/api/check-user?userId=${user.id}`);
          const data = await response.json();
          if (!data.exists) {
            setShowUsernameModal(true);
          }
        } catch (error) {
          console.error("Error checking user:", error);
        }
      }
    };

    checkUser();
  }, [user?.id]);

  return (
    <div
      className={`${inter.className} min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 flex flex-col`}
    >
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            PESOS<sup className="text-sm text-green-700">*</sup>
          </h1>
          <div className="flex items-center space-x-4">
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="outline">Sign In</Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </div>
      </header>
      <main className="flex-grow relative">
        {showUsernameModal && <UsernameModal />}
        {children}
        <div className="border-green-700 max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <p className="text-sm text-gray-700 hidden">
            PESOS backs up your projects via RSS feeds so you have more control
            over your stuff. This helps when sites go down, turn fascist, or
            whatever the case may be.
          </p>
        </div>
      </main>
    </div>
  );
}
