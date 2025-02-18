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
        const res = await fetch("/api/createUser", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create user");

        router.push("/dashboard");
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Failed to create user"
        );
      }
      setLoading(false);
    },
    [user, router]
  );

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
        if (data.error) {
          setError(data.error);
        }
      }
    } catch (err) {
      console.error(err);
      setError("Error checking username");
      setAvailability("unavailable");
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setUsername(newValue);
    setError("");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 relative">
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
          <button
            disabled={availability !== "available"}
            className="px-6 py-3 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Get started
          </button>
        </SignInButton>
      ) : (
        <button
          onClick={() => handleSubmitUsername(username)}
          disabled={availability !== "available" || loading}
          className="px-6 py-3 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating..." : "Get started"}
        </button>
      )}
    </div>
  );
}
