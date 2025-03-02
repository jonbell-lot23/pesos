import React, { useState, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DisabledFeedsBannerProps {
  visible: boolean;
  disabledSources?: string[];
}

export default function DisabledFeedsBanner({
  visible,
  disabledSources = [],
}: DisabledFeedsBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    const isDismissed =
      localStorage.getItem("disabledFeedsBannerDismissed") === "true";
    setDismissed(isDismissed);
  }, []);

  if (!visible || dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem("disabledFeedsBannerDismissed", "true");
    setDismissed(true);
  };

  // Format the disabled sources for display
  const sourcesText =
    disabledSources.length > 0 ? ` (${disabledSources.join(", ")})` : "";

  return (
    <div className="bg-black text-white p-4 mb-6 rounded-md flex items-start justify-between">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium">
            Quick note: we've disabled some of your feeds because they were
            pointing at news content rather than personal projects{sourcesText}.
          </p>
        </div>
      </div>
      <Button
        onClick={handleDismiss}
        variant="ghost"
        className="ml-4 text-black font-medium bg-white hover:bg-red-100 hover:text-black"
      >
        Ok
      </Button>
    </div>
  );
}
