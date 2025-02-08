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

interface RootLayoutInnerProps {
  children: React.ReactNode;
  inter: NextFont;
}

export function RootLayoutInner({ children, inter }: RootLayoutInnerProps) {
  const { user } = useUser();

  return (
    <div
      className={`${inter.className} min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 flex flex-col`}
    >
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            PESOS<sup className="text-md text-black">*</sup>
          </h1>
          <div className="flex items-center space-x-4">
            <div className="mr-4 flex space-x-4">
              <Link href="/guest/export">
                <h2>Export</h2>
              </Link>
              <Link href="/guest/backup">
                <h2>Backup</h2>
              </Link>
              <Link href="/guest/feed">
                <h2>Feed</h2>
              </Link>
              <Link href="/post">
                <h2>Posts</h2>
              </Link>
            </div>
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
        {children}
        <div className="border-green-700 max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <p className="text-sm text-gray-700">
            *Publish Elsewhere, Syndicate On (Your Own) Site. This helps when
            sites go down, turn fascist, or whatever the case may be.
          </p>
        </div>
      </main>
    </div>
  );
}
