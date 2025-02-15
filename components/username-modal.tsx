import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignInButton } from "@clerk/nextjs";
import { Button } from "./ui/button";

export default function UsernameModal() {
  const { user, isSignedIn } = useUser();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!user) {
        throw new Error("User not loaded");
      }
      console.log("[UsernameModal] Submitting user creation with:", {
        username,
        clerkId: user.id,
      });
      const res = await fetch("/api/createUser", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, clerkId: user.id }),
      });

      console.log("[UsernameModal] Create user response status:", res.status);
      const data = await res.json();
      console.log("[UsernameModal] Create user response data:", data);

      if (!res.ok) {
        const errorData = await res.json();
        console.error("[UsernameModal] Error response:", errorData);
        throw new Error(errorData.error || "Failed to create user");
      }

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

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Choose a Username</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
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
      </div>
    </div>
  );
}
