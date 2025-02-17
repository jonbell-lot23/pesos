"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser, SignInButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function LandingPageWithUsername() {
  const { user } = useUser();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [availability, setAvailability] = useState("neutral"); // 'neutral' | 'checking' | 'available' | 'unavailable'
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmitUsername = useCallback(
    async (usernameToSubmit: string) => {
      setLoading(true);
      try {
        if (!user) return;

        const payload = { username: usernameToSubmit, clerkId: user.id };
        console.log("[LandingPageWithUsername] Submitting username:", payload);

        const res = await fetch("/api/createUser", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        console.log("[LandingPageWithUsername] Submission response:", data);

        if (!res.ok) throw new Error(data.error || "Failed to create user");

        router.push("/stats");
      } catch (error) {
        console.error(
          "[LandingPageWithUsername] Error submitting username:",
          error
        );
        setError(
          error instanceof Error ? error.message : "Failed to create user"
        );
      }
      setLoading(false);
    },
    [user, router]
  );

  // Check for returning user with stored username
  useEffect(() => {
    if (user) {
      const storedUsername = localStorage.getItem("chosenUsername");
      console.log(
        "[LandingPageWithUsername] User loaded, stored username:",
        storedUsername
      );
      if (storedUsername) {
        handleSubmitUsername(storedUsername);
      }
    }
  }, [user, handleSubmitUsername]);

  useEffect(() => {
    if (!username.trim()) {
      setAvailability("neutral");
      return;
    }
    const timer = setTimeout(() => {
      checkAvailability(username);
    }, 500);
    return () => clearTimeout(timer);
  }, [username]);

  useEffect(() => {
    if (user && !loading) {
      const storedUsername = localStorage.getItem("chosenUsername");
      console.log(
        "[LandingPageWithUsername] User loaded, stored username:",
        storedUsername
      );
      if (storedUsername && availability === "available") {
        console.log(
          "[LandingPageWithUsername] Auto-submitting stored username after sign-in"
        );
        handleSubmitUsername(storedUsername);
      }
    }
  }, [user, loading, availability, handleSubmitUsername]);

  async function checkAvailability(name: string) {
    try {
      setAvailability("checking");
      const res = await fetch(
        `/api/check-username?username=${encodeURIComponent(name)}`
      );
      const data = await res.json();
      if (data.available) {
        setAvailability("available");
      } else {
        setAvailability("unavailable");
      }
    } catch (err) {
      console.error(err);
      setError("Error checking username");
      setAvailability("unavailable");
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    console.log(
      "[LandingPageWithUsername] Input changed. New value:",
      newValue
    );
    setUsername(newValue);
    localStorage.setItem("chosenUsername", newValue);
    console.log(
      "[LandingPageWithUsername] Updated chosenUsername in localStorage:",
      localStorage.getItem("chosenUsername")
    );
  };

  const handleGetStarted = () => {
    if (availability !== "available") {
      console.log("Username unavailable, cannot proceed.");
      return;
    }
    console.log(
      "[LandingPageWithUsername] Saving username and redirecting to sign-in:",
      username
    );
    localStorage.setItem("chosenUsername", username);
    router.push("/sign-in");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 relative">
      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded">Loading...</div>
        </div>
      )}
      <h1 className="text-3xl font-bold mb-8">Reserve your username</h1>
      <div className="mb-4 flex items-center">
        <span className="mr-2 text-lg">PESOS.site/</span>
        <input
          type="text"
          placeholder="type a username"
          value={username}
          onChange={handleInputChange}
          className="border p-2 rounded text-lg"
        />
      </div>
      <div className="mb-4 text-lg">
        {availability === "checking" && <span>Checking...</span>}
        {availability === "available" && (
          <span className="text-green-600">Available ✓</span>
        )}
        {availability === "unavailable" && username.trim() && (
          <span className="text-red-600">Unavailable</span>
        )}
      </div>
      {error && <div className="text-red-600 mb-4">{error}</div>}
      {!user ? (
        <SignInButton mode="modal">
          <button className="px-6 py-3 bg-black text-white rounded hover:bg-gray-800">
            Get started
          </button>
        </SignInButton>
      ) : (
        <button
          onClick={() => handleSubmitUsername(username)}
          className="px-6 py-3 bg-black text-white rounded hover:bg-gray-800"
        >
          Get started
        </button>
      )}
    </div>
  );
}
