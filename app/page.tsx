"use client";

import { useUser, SignUpButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Page() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && user) {
      router.replace("/dashboard");
    }
  }, [isLoaded, user, router]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center bg-black text-white px-4">
      <h1 className="text-3xl md:text-5xl font-bold mb-4">
        PESOS backs up your projects once a week.
      </h1>
      <p className="mb-6 text-lg md:text-xl">
        Keep your creative work safe with automatic weekly backups.
      </p>
      <SignUpButton mode="modal">
        <button className="px-6 py-3 bg-white text-black rounded-lg hover:bg-gray-200">
          Get Started
        </button>
      </SignUpButton>
    </div>
  );
}
