"use client";

import { useEffect } from "react";
import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      const oldChosenUsername = localStorage.getItem("chosenUsername");
      console.log(
        "[LoginPage] On mount, old chosenUsername:",
        oldChosenUsername
      );
      localStorage.removeItem("chosenUsername");
      console.log(
        "[LoginPage] After clearing, chosenUsername:",
        localStorage.getItem("chosenUsername")
      );
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" />
      </div>
    </div>
  );
}
