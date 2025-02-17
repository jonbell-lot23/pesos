import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SignInButton } from "@clerk/nextjs";
import { Button } from "./ui/button";

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

  // Modify the useEffect to initialize the username state from localStorage if a value exists
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("chosenUsername");
      console.log(
        "[UsernameModal] Found chosenUsername in localStorage on mount:",
        stored
      );
      if (stored && stored.trim() !== "") {
        console.log(
          "[UsernameModal] Using existing chosenUsername from localStorage:",
          stored
        );
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

  // DEBUG: Commenting out auto-redirect / early return logic that prevents the modal from displaying
  // if (currentUser && manualChosenName) return null;

  if (!isSignedIn) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white p-6 rounded-lg">
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

  // If loading local user check, don't render anything
  if (loadingLocal) return null;

  // Always render the modal to allow manual name update
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const oldValue = localStorage.getItem("chosenUsername") || "(none)";
    console.log(
      "[UsernameModal] onChange - Old chosenUsername:",
      oldValue,
      "New input value:",
      newValue
    );
    setUsername(newValue);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log(
      "[UsernameModal] handleSubmit triggered with username state:",
      username
    );
    setLoading(true);
    setError("");

    try {
      if (!currentUser) {
        throw new Error("User not loaded");
      }
      const payload = { username, clerkId: currentUser.id };
      console.log(
        "[UsernameModal] Submitting user creation with payload:",
        payload
      );
      const res = await fetch("/api/createUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      console.log("[UsernameModal] Create user response status:", res.status);
      const data = await res.json();
      console.log("[UsernameModal] Create user response data:", data);

      if (!res.ok) {
        console.error("[UsernameModal] Error response in handleSubmit:", data);
        throw new Error(data.error || "Failed to create user");
      }

      const oldUsername = localStorage.getItem("chosenUsername") || "(none)";
      console.log(
        "[UsernameModal] Before updating localStorage in handleSubmit - Old chosenUsername:",
        oldUsername,
        "New chosenUsername:",
        username
      );

      localStorage.removeItem("chosenUsername");
      localStorage.setItem("chosenUsername", username);
      setManualChosenName(username);
      console.log(
        "[UsernameModal] Updated chosenUsername in localStorage:",
        localStorage.getItem("chosenUsername")
      );

      router.push("/feed-selection");
    } catch (error) {
      console.error("[UsernameModal] Error in handleSubmit:", error);
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
      <div className="bg-white p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Choose a Username</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={username}
            onChange={handleInputChange}
            onKeyUp={(e) =>
              console.log(
                "[UsernameModal] onKeyUp:",
                e.key,
                e.currentTarget.value
              )
            }
            onKeyDown={(e) =>
              console.log(
                "[UsernameModal] onKeyDown:",
                e.key,
                e.currentTarget.value
              )
            }
            className="border border-gray-300 rounded px-3 py-2 w-full mb-4"
            placeholder="Enter a username"
            required
          />
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 text-white rounded px-4 py-2 w-full"
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
