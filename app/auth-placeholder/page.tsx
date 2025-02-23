"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: any, config: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export default function AuthPlaceholder() {
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement>(null);

  const handleCredentialResponse = (response: any) => {
    // Send the response.credential to your server for verification
    fetch("/api/auth/google", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ credential: response.credential }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          router.push("/setup-complete");
        } else {
          console.error("Authentication failed");
        }
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  };

  useEffect(() => {
    if (typeof window === "undefined" || !buttonRef.current) return;

    const initializeGoogle = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
        });

        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
        });
      }
    };

    // Initialize if Google API is already loaded
    initializeGoogle();

    // Or wait for it to load
    const script = document.querySelector('script[src*="accounts.google.com"]');
    if (script) {
      script.addEventListener("load", initializeGoogle);
    }

    return () => {
      if (script) {
        script.removeEventListener("load", initializeGoogle);
      }
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>Choose your sign in method</CardDescription>
      </CardHeader>
      <CardContent>
        <div id="googleSignInButton" ref={buttonRef} />
      </CardContent>
    </Card>
  );
}
