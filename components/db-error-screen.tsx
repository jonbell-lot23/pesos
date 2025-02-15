import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";

export default function DBErrorScreen() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Alert variant="destructive" className="bg-white border-red-200 mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Database Connection Error</AlertTitle>
          <AlertDescription>
            We're unable to connect to our database at the moment. This might be
            a temporary issue.
          </AlertDescription>
        </Alert>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">What you can do:</h2>
          <ul className="list-disc list-inside mb-6 space-y-2">
            <li>Wait a few minutes and try again</li>
            <li>Check if your internet connection is stable</li>
            <li>Contact support if the issue persists</li>
          </ul>

          <Button onClick={handleRetry} className="w-full">
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
}
