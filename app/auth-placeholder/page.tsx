"use client";

import { useEffect } from "react";
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
          renderButton: (element: HTMLElement, config: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export default function AuthPlaceholder() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window.google !== "undefined") {
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      });

      window.google.accounts.id.renderButton(
        document.getElementById("googleSignInButton")!,
        {
          theme: "outline",
          size: "large",
        }
      );
    }
  }, []);

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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-100 to-white p-4 w-full">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Google Authentication
          </CardTitle>
          <CardDescription>
            Connect your Google account to complete the setup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            To securely store your RSS feed backups, we need to connect to your
            Google account. This allows us to save your data in Google Drive.
          </p>
          <p className="mb-4">
            Don't worry, we only request access to a specific folder for PESOS
            and won't access any of your other data.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <div id="googleSignInButton"></div>
        </CardFooter>
      </Card>
    </div>
  );
}
