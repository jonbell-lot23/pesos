"use client";

import { SignInButton, useAuth, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function BackupPage() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  return (
    <div className="w-full flex justify-between items-center">
      <div className="flex min-h-screen w-full flex-col p-8">
        <div className="flex justify-center items-center my-8">
          <Button className="text-sm hover:bg-blue-500">Backup</Button>
        </div>
        {!isSignedIn ? (
          <div className="flex flex-col items-center justify-center h-full">
            <h1 className="text-black text-2xl mb-4">Hello, please sign in!</h1>
            <SignInButton mode="modal">
              <Button className="text-sm hover:bg-blue-500">Sign In</Button>
            </SignInButton>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <h1 className="text-black text-2xl">
              Welcome to the Backup page,{" "}
              {user?.primaryEmailAddress?.emailAddress || user?.username}!
            </h1>
          </div>
        )}
      </div>
    </div>
  );
}
