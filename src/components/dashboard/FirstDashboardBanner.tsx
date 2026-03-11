import { useState } from "react";
import { X, Calendar, Activity } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const DISMISSED_KEY = "first_dashboard_banner_dismissed";

interface FirstDashboardBannerProps {
  calendarConnected: boolean;
  wearableConnected: boolean;
  visitCount: number;
}

function getMessage(cal: boolean, wear: boolean): string | null {
  if (cal && !wear) {
    return "We've pulled in your week from Google Calendar. Add your wearable in Settings to see the full Plan vs. Actual picture.";
  }
  if (cal && wear) {
    return "Your first wearable sync will arrive tomorrow morning. Come back then to see your Plan vs. Actual.";
  }
  if (!cal && !wear) {
    return "Connect your calendar and wearable in Settings to unlock Plan vs. Actual.";
  }
  // wearable connected but not calendar — unlikely but handle
  return "Connect your calendar in Settings to unlock the full Plan vs. Actual view.";
}

export function FirstDashboardBanner({
  calendarConnected,
  wearableConnected,
  visitCount,
}: FirstDashboardBannerProps) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED_KEY) === "true";
    } catch {
      return false;
    }
  });

  if (dismissed || visitCount > 3) return null;

  const message = getMessage(calendarConnected, wearableConnected);
  if (!message) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "true");
    } catch {}
  };

  return (
    <Alert
      className="relative cursor-pointer border-accent/30 bg-accent/5"
      onClick={dismiss}
    >
      <div className="flex items-start gap-2">
        {calendarConnected ? (
          <Calendar className="h-4 w-4 shrink-0 text-accent mt-0.5" />
        ) : (
          <Activity className="h-4 w-4 shrink-0 text-accent mt-0.5" />
        )}
        <AlertDescription className="text-sm text-foreground flex-1">
          {message}
        </AlertDescription>
        <button
          onClick={(e) => { e.stopPropagation(); dismiss(); }}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </Alert>
  );
}
