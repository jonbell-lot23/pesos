import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SignInButton } from "@clerk/nextjs";
import { Button } from "./ui/button";
import { validateUsername } from "@/lib/utils";

export default function UsernameModal() {
  const { user, isSignedIn } = useUser();
  const currentUser = user as {
    id: string;
    publicMetadata?: { chosenUsername?: string };
    username?: string;
  } | null;
  const [loadingLocal, setLoadingLocal] = useState(true);
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [validationError, setValidationError] = useState("");
  const [availability, setAvailability] = useState("neutral"); // 'neutral' | 'checking' | 'available' | 'unavailable'
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Local state to track manualChosenName from localStorage
  const [manualChosenName, setManualChosenName] = useState<string | null>(null);

  // Add a debug state variable for localStorage chosenUsername after other useState declarations
  const [debugLocal, setDebugLocal] = useState<string>("");

  // After all useState declarations, add a console log for component rendering
  console.log("[UsernameModal] Component rendering. Current state:", {
    username,
    manualChosenName,
  });

  // Move useEffect before any conditional returns
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("chosenUsername");
      if (stored && stored.trim() !== "") {
        setManualChosenName(stored);
        setUsername(stored);
      } else {
        setManualChosenName("");
        setUsername("");
      }
    }
    setLoadingLocal(false);
  }, []);

  // Add a useEffect to log on window load
  useEffect(() => {
    window.addEventListener("load", () => {
      console.log(
        "[UsernameModal] Window load event triggered. Current chosenUsername in localStorage:",
        localStorage.getItem("chosenUsername")
      );
    });
  }, []);

  // Update debugLocal on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("chosenUsername") || "";
      setDebugLocal(stored);
      console.log(
        "[UsernameModal] Debug useEffect: localStorage chosenUsername:",
        stored
      );
    }
  }, []);

  // Move useEffect before any conditional returns
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

  // Restore the auto-redirect logic
  if (currentUser?.publicMetadata?.chosenUsername || manualChosenName) {
    return null;
  }

  if (!isSignedIn) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white p-6 rounded-lg modal-content">
          <h2 className="text-xl font-semibold mb-4">Please Sign In</h2>
          <p className="mb-4">You need to sign in to continue.</p>
          <SignInButton mode="modal">
            <Button variant="default" className="w-full">
              Sign In
            </Button>
          </SignInButton>
        </div>
      </div>
    );
  }

  if (loadingLocal) return null;

  // Add the key down handler before the handleInputChange declaration
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    console.log("[KEYPRESS]:", e.key);
  };

  // Always render the modal to allow manual name update
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("[KEYSTROKE]:", e.target.value);
    // Only allow alphanumeric and underscore
    const newValue = e.target.value.replace(/[^a-zA-Z0-9_]/g, "");
    console.log("[UsernameModal] Input changed to:", newValue);

    setUsername(newValue);
    // Update localStorage immediately during typing
    localStorage.setItem("chosenUsername", newValue);
    console.log("[UsernameModal] Updated localStorage with:", newValue);
    console.log(
      "[UsernameModal] Verification - current localStorage value:",
      localStorage.getItem("chosenUsername")
    );

    setError("");
    setValidationError(""); // Clear any previous validation errors

    // Only proceed with availability check if we have at least 3 characters
    if (newValue.length >= 3) {
      setAvailability("checking");
      console.log("[UsernameModal] Checking availability for:", newValue);
    } else {
      setAvailability("neutral");
    }
  };

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Username cannot be empty");
      return;
    }

    // Validate username before submitting
    const validationResult = validateUsername(username);
    if (!validationResult.isValid) {
      setValidationError(validationResult.error || "");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (!currentUser) {
        throw new Error("User not loaded");
      }
      const payload = { username, clerkId: currentUser.id };
      const res = await fetch("/api/createUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create user");
      }

      localStorage.setItem("chosenUsername", username);
      setManualChosenName(username);

      router.push("/feed-selection");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to create user. Please try again."
      );
    }
    setLoading(false);
  };

  // Ensure in the render return we log the current localStorage value
  console.log(
    "[UsernameModal] Rendering modal. Current localStorage chosenUsername:",
    localStorage.getItem("chosenUsername")
  );

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md modal-content">
        <h2 className="text-xl font-semibold mb-4">Choose your username</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
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
                value={username}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                className={`w-full border p-2 rounded text-lg ${
                  availability === "unavailable"
                    ? "border-red-500 focus:ring-red-500"
                    : availability === "available"
                    ? "border-green-500 focus:ring-green-500"
                    : "border-gray-300 focus:ring-blue-500"
                }`}
                placeholder="Enter a username"
                required
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
          {validationError && (
            <div className="text-red-600 text-sm">{validationError}</div>
          )}
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white rounded px-4 py-2 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create User"}
          </button>
        </form>
        {/* Debug output for localStorage chosenUsername */}
        <div
          style={{
            marginTop: "12px",
            padding: "4px",
            border: "1px dashed red",
          }}
        >
          <strong>DEBUG:</strong> current localStorage chosenUsername:{" "}
          {debugLocal}
        </div>
      </div>
    </div>
  );
}
