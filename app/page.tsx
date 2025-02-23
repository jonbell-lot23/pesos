"use client";

export const dynamic = "force-dynamic";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import LandingPageWithUsername from "@/components/LandingPageWithUsername";
import Spinner from "@/components/Spinner";

export default function Page() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(true);
  const [localUsername, setLocalUsername] = useState<string | null>(null);

  // Add effect to watch localStorage changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedUsername = localStorage.getItem("chosenUsername");
    setLocalUsername(storedUsername);

    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function (key, value) {
      console.log(`[localStorage] Setting ${key} to:`, value);
      originalSetItem.apply(this, [key, value]);
      if (key === "chosenUsername") {
        setLocalUsername(value);
      }
    };

    // Log initial state
    console.log("[Page] Initial localStorage state:", {
      chosenUsername: storedUsername,
    });

    return () => {
      localStorage.setItem = originalSetItem;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    async function checkUserAndRedirect() {
      if (user) {
        // Check if user has a username in Clerk metadata
        const hasClerkUsername = user.publicMetadata?.chosenUsername;
        console.log("[Page] Clerk username:", hasClerkUsername);
        console.log("[Page] Local username:", localUsername);

        // If we have a username in localStorage but user isn't in database yet, create them
        if (localUsername && localUsername.trim() !== "") {
          console.log(
            "[Page] Found username in localStorage, attempting to create user..."
          );
          try {
            // Try to create the user
            const createRes = await fetch("/api/createUser", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                username: localUsername,
                clerkId: user.id,
              }),
            });

            const createData = await createRes.json();
            console.log("[Page] Create user response:", createData);

            if (createData.success) {
              console.log(
                "[Page] Successfully created user, proceeding to dashboard"
              );
              router.replace("/dashboard");
              return;
            }
          } catch (error) {
            console.error("[Page] Error auto-creating user:", error);
          }
        }

        // Check if user exists in database
        console.log("[Page] Verifying user exists in database");
        try {
          const verifyRes = await fetch("/api/getLocalUser", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clerkId: user.id,
              chosenUsername: localUsername || hasClerkUsername,
            }),
          });

          const verifyData = await verifyRes.json();
          console.log("[Page] Database verification result:", verifyData);

          if (!verifyData.localUser) {
            console.log(
              "[Page] User not found in database, showing landing page"
            );
            setIsRedirecting(false);
            return;
          }

          // User exists in database, proceed with redirect
          console.log("[Page] User verified, redirecting to dashboard");
          router.replace("/dashboard");
        } catch (error) {
          console.error("[Page] Error verifying user:", error);
          setIsRedirecting(false);
        }
      } else {
        console.log("[Page] No user, showing landing page");
        setIsRedirecting(false);
      }
    }

    checkUserAndRedirect();
  }, [user, router, isLoaded, localUsername]);

  // Add effect to log state changes
  useEffect(() => {
    console.log("[Page] State updated:", {
      isLoaded,
      isRedirecting,
      hasUser: !!user,
      localUsername,
    });
  }, [isLoaded, isRedirecting, user, localUsername]);

  if (!isLoaded || isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Spinner />
      </div>
    );
  }

  console.log("[Page] Rendering LandingPageWithUsername");
  return <LandingPageWithUsername />;
}
