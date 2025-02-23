"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser, SignInButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { validateUsername } from "@/lib/utils";

export default function LandingPageWithUsername() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [availability, setAvailability] = useState("neutral"); // 'neutral' | 'checking' | 'available' | 'unavailable'
  const [validationError, setValidationError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Clear localStorage on mount
  useEffect(() => {
    // Only clear if we don't have a verified user
    if (!user?.publicMetadata?.chosenUsername) {
      localStorage.removeItem("chosenUsername");
      console.log("[LandingPage] Cleared localStorage on mount");
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow alphanumeric and underscore
    const newValue = e.target.value.replace(/[^a-zA-Z0-9_]/g, "");

    console.log("[handleInputChange] Current value:", newValue);

    // Save to localStorage as they type
    localStorage.setItem("chosenUsername", newValue);
    console.log("[handleInputChange] Saved to localStorage:", newValue);

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

        // Clear any existing username from localStorage
        localStorage.removeItem("chosenUsername");

        console.log("[LandingPage] Creating user with:", {
          username: usernameToSubmit,
          clerkId: user.id,
        });

        const payload = { username: usernameToSubmit, clerkId: user.id };
        const res = await fetch("/api/createUser", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        console.log("[LandingPage] Create user response:", data);

        if (!res.ok) throw new Error(data.error || "Failed to create user");

        // Verify the user was created
        if (!data.success || !data.localUser) {
          throw new Error(
            "User creation failed: " + (data.error || "Unknown error")
          );
        }

        // Double check the user exists in the database
        const verifyRes = await fetch("/api/getLocalUser", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clerkId: user.id,
            chosenUsername: usernameToSubmit,
          }),
        });

        const verifyData = await verifyRes.json();
        console.log("[LandingPage] Verify user response:", verifyData);

        if (!verifyData.localUser) {
          throw new Error(
            "User verification failed - user not found in database"
          );
        }

        // Only save to localStorage after successful creation and verification
        localStorage.setItem("chosenUsername", usernameToSubmit);
        console.log(
          "[LandingPage] User verified and saved to localStorage:",
          usernameToSubmit
        );

        // Clear any existing feed selection
        localStorage.removeItem("selectedFeeds");

        // Redirect to feed selection after successful user creation and verification
        router.push("/feed-selection");
      } catch (error) {
        console.error("[LandingPage] Error creating user:", error);
        setError(
          error instanceof Error ? error.message : "Failed to create user"
        );
        setLoading(false);
        return;
      }
      setLoading(false);
    },
    [user, router]
  );

  // Show loading state while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center p-8 relative">
      {/* Hero Section */}
      <div className="w-full max-w-6xl mx-auto text-center mb-16">
        {/* Illustration Space */}
        <div
          className="w-full h-96 mb-16 rounded-xl flex items-center justify-center bg-cover bg-center"
          style={{ backgroundImage: "url('/couch.jpg')" }}
        ></div>

        {/* Description and Sign In Sections */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="space-y-4 p-0 rounded-xl text-left">
            <h2 className="text-2xl font-bold text-black">What is PESOS?</h2>
            <p className="text-gray-700 leading-relaxed mr-12">
              PESOS stands for Publish Elsewhere, Syndicate (on your) Own Site.
              It's a way to take all the stuff you're posting all over the
              internet and pull it back into one simple, searchable, ownable,
              exportable place.
            </p>
          </div>

          {/* Username Section */}
          <div className="space-y-4 bg-white rounded-lg">
            <h2 className="text-2xl font-bold text-left mb-6">Get started</h2>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  id="username"
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  onChange={handleInputChange}
                  className={`w-full border p-2 rounded-lg text-lg ${
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

              {!isLoaded || !user ? (
                <SignInButton mode="modal">
                  <button className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
                    {"->"}
                  </button>
                </SignInButton>
              ) : (
                <button
                  onClick={() => handleSubmitUsername(username)}
                  disabled={loading}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {loading ? "Creating..." : "Get started"}
                </button>
              )}
            </div>

            {validationError && (
              <div className="text-red-600 text-sm">{validationError}</div>
            )}
            {error && <div className="text-red-600 text-sm">{error}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
