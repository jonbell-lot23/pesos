"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { SignInButton } from "@clerk/nextjs";

export default function LandingPageWithUsername() {
  const { user } = useUser();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [availability, setAvailability] = useState("neutral"); // 'neutral' | 'checking' | 'available' | 'unavailable'
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    console.log(
      "[LandingPageWithUsername] Component loaded with chosenUsername from localStorage:",
      localStorage.getItem("chosenUsername")
    );
  }, []);

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

  const handleReserve = async () => {
    if (availability !== "available") {
      console.log("Username unavailable, cannot reserve.");
      return;
    }
    setLoading(true);
    try {
      if (!user) {
        throw new Error("User not loaded");
      }
      const payload = { username, clerkId: user.id };
      console.log(
        "[LandingPageWithUsername] Submitting user reservation with payload:",
        payload
      );
      const res = await fetch("/api/createUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      console.log(
        "[LandingPageWithUsername] Create user response status:",
        res.status
      );
      const data = await res.json();
      console.log("[LandingPageWithUsername] Create user response data:", data);
      // Save reserved username and redirect
      localStorage.setItem("reservedUsername", username);
      router.push("/feed-selection");
    } catch (error) {
      console.error(
        "[LandingPageWithUsername] Error in reserving username:",
        error
      );
      setError(
        error instanceof Error
          ? error.message
          : "Failed to create user. Please try again."
      );
    }
    setLoading(false);
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
          onClick={handleReserve}
          className="px-6 py-3 bg-black text-white rounded hover:bg-gray-800"
        >
          Get started
        </button>
      )}
    </div>
  );
}
