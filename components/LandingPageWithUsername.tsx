"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser, SignInButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { validateUsername } from "@/lib/utils";

export default function LandingPageWithUsername() {
  const { user } = useUser();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [availability, setAvailability] = useState("neutral"); // 'neutral' | 'checking' | 'available' | 'unavailable'
  const [validationError, setValidationError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow alphanumeric and underscore
    const newValue = e.target.value.replace(/[^a-zA-Z0-9_]/g, "");
    setUsername(newValue);
    setError("");
    setValidationError(""); // Clear any previous validation errors

    // Only proceed with availability check if we have at least 3 characters
    if (newValue.length >= 3) {
      setAvailability("checking");
    } else {
      setAvailability("neutral");
    }
  };

  useEffect(() => {
    if (!username.trim() || username.trim().length < 3) {
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

  const handleSubmitUsername = useCallback(
    async (usernameToSubmit: string) => {
      // Validate username before submitting
      const validationResult = validateUsername(usernameToSubmit);
      if (!validationResult.isValid) {
        setValidationError(validationResult.error || "");
        return;
      }

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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 relative">
      <h1 className="text-3xl font-bold mb-8">Reserve your username</h1>

      <div className="w-full max-w-md space-y-4">
        <div className="flex flex-col space-y-2">
          <label
            htmlFor="username"
            className="text-sm font-medium text-gray-700"
          >
            Choose your username
          </label>
          <div className="relative">
            <input
              id="username"
              type="text"
              placeholder="type a username"
              value={username}
              onChange={handleInputChange}
              className={`w-full border p-2 rounded text-lg ${
                availability === "unavailable"
                  ? "border-red-500 focus:ring-red-500"
                  : availability === "available"
                  ? "border-green-500 focus:ring-green-500"
                  : "border-gray-300 focus:ring-blue-500"
              }`}
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              {availability === "checking" && (
                <span className="text-gray-500">Checking...</span>
              )}
              {availability === "available" && (
                <span className="text-green-600">Available ✓</span>
              )}
              {availability === "unavailable" && (
                <span className="text-red-600">Unavailable</span>
              )}
            </div>
          </div>
        </div>

        {/* Validation Messages - only show if there was a submit attempt */}
        {validationError && (
          <div className="text-red-600 text-sm">{validationError}</div>
        )}
        {error && <div className="text-red-600 text-sm">{error}</div>}

        {/* Submit Button */}
        {!user ? (
          <SignInButton mode="modal">
            <button className="w-full px-6 py-3 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed">
              Get started
            </button>
          </SignInButton>
        ) : (
          <button
            onClick={() => handleSubmitUsername(username)}
            disabled={loading}
            className="w-full px-6 py-3 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Get started"}
          </button>
        )}
      </div>
    </div>
  );
}
