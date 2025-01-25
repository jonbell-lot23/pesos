"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@clerk/nextjs"; // Corrected import for Clerk's auth mechanism

export default function WelcomeScreen() {
  const { isSignedIn } = useAuth(); // Use Clerk's useAuth to check if the user is signed in

  if (isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-blue-100 to-white p-4">
        <Link href="/feed-display">
          <Button className="mb-8">Continue to Feeds</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-100 to-white p-4 w-full">
      <h1 className="text-4xl font-bold text-center mb-4">Welcome to PESOS*</h1>
      <p className="text-xl text-center mb-8 max-w-4xl">
        Back up all your little RSS feeds nightly so you control your stuff,
        even when sites go dark, or turn into nazis, or whatever
      </p>
      <Link href="/feed-selection">
        <Button className="mb-8">Get Started</Button>
      </Link>
      <p className="text-sm text-center max-w-md">
        *Publish Elsewhere, Syndicate (to your) Own Site
      </p>
    </div>
  );
}
