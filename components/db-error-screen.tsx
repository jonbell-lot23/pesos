import { Button } from "./ui/button";
import { useState, useEffect } from "react";

export default function DBErrorScreen() {
  const [isRestarting, setIsRestarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [retryTimeout, setRetryTimeout] = useState<NodeJS.Timeout | null>(null);
  const isDev = process.env.NODE_ENV === "development";

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [retryTimeout]);

  const handleRetry = async () => {
    if (isRestarting) return;

    setIsRestarting(true);
    setError(null);

    try {
      const response = await fetch("/api/restart-db", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to restart database connection");
      }

      // If successful, reload the page
      window.location.reload();
    } catch (error) {
      console.error("Failed to restart database:", error);
      setError(
        error instanceof Error ? error.message : "Failed to restart database"
      );
      setIsRestarting(false);

      // Increment retry count and set up automatic retry if under threshold
      const newRetryCount = retryCount + 1;
      setRetryCount(newRetryCount);

      if (newRetryCount < 3) {
        const timeout = setTimeout(() => {
          handleRetry();
        }, 5000); // Wait 5 seconds before retrying
        setRetryTimeout(timeout);
      }
    }
  };

  // Function to simulate a DB error
  const simulateError = async () => {
    try {
      const response = await fetch("/api/test-db-error", {
        method: "POST",
      });
      if (!response.ok) {
        window.location.reload(); // Reload to show the error state
      }
    } catch (error) {
      console.error("Error simulating DB error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <p className="text-gray-700 mb-4">
          I'm still working out some kinks, and sometimes the DB falls over.
          {retryCount > 0
            ? " Attempting to reconnect automatically..."
            : " Please wait while I try to reconnect."}
        </p>
        {error && (
          <p className="text-red-600 mb-4 text-sm">
            {error}
            {retryCount >= 3 &&
              " (Multiple reconnection attempts failed - the database might be temporarily unavailable)"}
          </p>
        )}
        <Button
          onClick={handleRetry}
          className="w-full mb-4"
          disabled={isRestarting}
        >
          {isRestarting
            ? `Attempting to reconnect${".".repeat((retryCount % 3) + 1)}`
            : retryCount >= 3
            ? "Try again manually"
            : "Restart the app"}
        </Button>

        {isDev && (
          <div className="mt-8 pt-8 border-t border-gray-300">
            <p className="text-sm text-gray-500 mb-2">
              Development Testing Tools
            </p>
            <Button
              onClick={simulateError}
              variant="outline"
              className="w-full"
            >
              Simulate DB Error
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
