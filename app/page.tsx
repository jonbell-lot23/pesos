"use client";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import LandingPageWithUsername from "@/components/LandingPageWithUsername";

export default function Page() {
  console.log("DEBUG: Reserve your username page (app/page.tsx) loaded.");
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace("/stats");
    }
  }, [user, router]);

  return <LandingPageWithUsername />;
}
