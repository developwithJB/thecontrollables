import { useState } from "react";
import { Calendar, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/hooks/useAnalytics";

type TimePreference = "morning" | "evening";
type Source = "post_day_1" | "profile" | "paywall";

interface CalendarReminderButtonProps {
  /** Where the button is displayed - used for analytics */
  source: Source;
  /** User's timezone from profile, falls back to browser timezone */
  timezone?: string;
  /** Compact mode for inline usage */
  compact?: boolean;
  /** Show first-time subtext */
  showFirstTimeSubtext?: boolean;
  /** Custom class name */
  className?: string;
}

export function CalendarReminderButton({
  source,
  timezone,
  compact = false,
  showFirstTimeSubtext = false,
  className = "",
}: CalendarReminderButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTime, setSelectedTime] = useState<TimePreference | null>(null);
  const { toast } = useToast();
  const { trackEvent } = useAnalytics();

  // Get timezone - prefer passed value, fall back to browser
  const userTimezone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Detect calendar platform preference
  // Use .ics only for Safari on Apple devices (no Chrome)
  // All other browsers (including Chrome on any platform) use Google Calendar
  const shouldUseICS = () => {
    const ua = navigator.userAgent;
    // Safari on Apple devices (not Chrome, not CriOS which is Chrome on iOS)
    const isAppleSafari = /iPad|iPhone|iPod|Macintosh/.test(ua) && 
                          /Safari/.test(ua) && 
                          !/Chrome|CriOS|Chromium/.test(ua);
    return isAppleSafari;
  };

  const handleAddReminder = async (timePreference: TimePreference) => {
    setIsLoading(true);
    setSelectedTime(timePreference);

    try {
      const useICS = shouldUseICS();

      if (!useICS) {
        // Get Google Calendar URL - works for Chrome (mobile & desktop), Firefox, etc.
        const { data, error } = await supabase.functions.invoke("generate-calendar-reminder", {
          body: {
            time_preference: timePreference,
            timezone: userTimezone,
            format: "google",
          },
        });

        if (error) throw error;

        // Track the event (non-blocking)
        trackEvent("calendar_reminder", "calendar_reminder_created", {
          source,
          time_preference: timePreference,
          platform: "google",
        }).catch(() => {}); // Silently fail analytics

        // Open Google Calendar in new tab
        window.open(data.url, "_blank", "noopener,noreferrer");

        toast({
          title: "Opening Google Calendar",
          description: "Complete the setup in your calendar to save the reminder.",
        });
      } else {
        // Download .ics file for Safari on Apple devices
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-calendar-reminder`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({
              time_preference: timePreference,
              timezone: userTimezone,
              format: "ics",
            }),
          }
        );

        if (!response.ok) throw new Error("Failed to generate calendar file");

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "dashboard-checkin.ics";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Track the event (non-blocking)
        trackEvent("calendar_reminder", "calendar_reminder_created", {
          source,
          time_preference: timePreference,
          platform: "apple",
        }).catch(() => {}); // Silently fail analytics

        toast({
          title: "Calendar file downloaded",
          description: "Open the file to add the reminder to your calendar.",
        });
      }
    } catch (error) {
      console.error("Error creating calendar reminder:", error);
      toast({
        title: "Couldn't create reminder",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setSelectedTime(null);
    }
  };

  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading}
            className={`gap-2 ${className}`}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Calendar className="w-4 h-4" />
            )}
            Add a calendar reminder
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center">
          <DropdownMenuItem onClick={() => handleAddReminder("morning")}>
            Morning (7:00 AM)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAddReminder("evening")}>
            Evening (8:00 PM)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            disabled={isLoading}
            className="w-full gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Calendar className="w-4 h-4" />
            )}
            Add a calendar reminder
            <ChevronDown className="w-3 h-3 ml-auto" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-48">
          <DropdownMenuItem onClick={() => handleAddReminder("morning")}>
            Morning (7:00 AM)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAddReminder("evening")}>
            Evening (8:00 PM)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <p className="text-xs text-muted-foreground text-center">
        Uses your own calendar. No notifications from us.
      </p>

      {showFirstTimeSubtext && (
        <p className="text-xs text-muted-foreground/70 text-center italic">
          You're in control. Edit or delete it anytime.
        </p>
      )}
    </div>
  );
}
