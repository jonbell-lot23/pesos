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
      const res = await fetch(`/api/check-username`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: name }),
      });
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
      <div className="min-h-screen flex items-center justify-center bg-[#0d0d0d]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <>
      {/* Add Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Instrument+Serif:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <div className="min-h-screen bg-white text-black font-sans">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center justify-items-center">
            {/* Left column */}
            <div className="max-w-lg">
              <h1
                className="text-2xl sm:text-3xl lg:text-4xl font-normal text-black mb-6 leading-tight"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                You should back up your projects once a week, and that's all
                PESOS does.
              </h1>
            </div>

            {/* Right visualization with Username Section */}
            <div className="relative">
              <div className="p-1 bg-white rounded-xl mx-auto">
                <div className="flex gap-3 items-start">
                  <div className="relative flex-1">
                    <input
                      id="username"
                      type="text"
                      placeholder="Choose a username"
                      value={username}
                      onChange={handleInputChange}
                      className={`w-full bg-gray-100 border rounded-lg px-4 pt-1 pb-3 text-black placeholder-gray-500 text-lg focus:outline-none focus:ring-2 transition-all ${
                        availability === "unavailable"
                          ? "border-red-500/50 focus:ring-red-500/30"
                          : availability === "available"
                          ? "border-green-500/50 focus:ring-green-500/30"
                          : "border-gray-300 focus:ring-blue-500/30"
                      }`}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {availability === "checking" && (
                        <span className="text-gray-500 text-sm">
                          Checking...
                        </span>
                      )}
                      {availability === "available" && (
                        <span className="text-green-600 text-sm">
                          Available ✓
                        </span>
                      )}
                      {availability === "unavailable" && (
                        <span className="text-red-600 text-sm">
                          Unavailable
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleSubmitUsername(username)}
                    disabled={loading || availability !== "available"}
                    className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap font-medium"
                  >
                    {loading ? "Creating..." : "Get Started"}
                  </button>
                </div>
                {validationError && (
                  <div className="text-red-600 text-sm mb-2">
                    {validationError}
                  </div>
                )}
                {error && <div className="text-red-600 text-sm">{error}</div>}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
