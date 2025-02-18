"use client";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import LandingPageWithUsername from "@/components/LandingPageWithUsername";
import Spinner from "@/components/Spinner";

export default function Page() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;

    if (user) {
      router.replace("/dashboard");
    } else {
      setIsRedirecting(false);
    }
  }, [user, router, isLoaded]);

  if (!isLoaded || isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Spinner />
      </div>
    );
  }

  return <LandingPageWithUsername />;
}
