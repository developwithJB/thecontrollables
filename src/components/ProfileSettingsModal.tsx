import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Moon, Sun, CreditCard, Mail, Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CalendarReminderButton } from "@/components/CalendarReminderButton";

interface ProfileSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
  isPaid: boolean;
  onSignOut: () => void;
}

const COMMON_TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Central Europe (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "China (CST)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
  { value: "Pacific/Auckland", label: "New Zealand (NZST)" },
];

export function ProfileSettingsModal({
  open,
  onOpenChange,
  userId,
  userEmail,
  isPaid,
}: ProfileSettingsModalProps) {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [timezone, setTimezone] = useState("");
  const [emailNudgeEnabled, setEmailNudgeEnabled] = useState(false);
  const [emailNudgeTime, setEmailNudgeTime] = useState<"morning" | "evening">("morning");
  const [nudgeFrequency, setNudgeFrequency] = useState<"daily" | "weekly">("daily");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const { toast } = useToast();

  // Detect initial theme
  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark");
    setIsDark(isDarkMode);
  }, [open]);

  // Fetch profile on open
  useEffect(() => {
    if (!open || !userId) return;

    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("display_name, timezone, email_nudge_enabled, email_nudge_time, nudge_frequency")
          .eq("id", userId)
          .single();

        if (error && error.code !== "PGRST116") {
          console.error("Error fetching profile:", error);
        }

        if (data) {
          setDisplayName(data.display_name || "");
          setEmailNudgeEnabled(data.email_nudge_enabled || false);
          setEmailNudgeTime((data.email_nudge_time as "morning" | "evening") || "morning");
          setNudgeFrequency((data.nudge_frequency as "daily" | "weekly") || "daily");
          
          if (data.timezone) {
            setTimezone(data.timezone);
          } else {
            // Default to browser timezone
            setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
          }
        } else {
          // No profile yet, use browser timezone
          setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [open, userId]);

  const handleThemeToggle = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    
    if (newIsDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onOpenChange(false);
    navigate("/");
  };

  const handleSave = async () => {
    if (!userId) return;

    setIsSaving(true);
    try {
      // Update profile with all settings
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          display_name: displayName.trim() || null,
          timezone: timezone,
          email_nudge_enabled: emailNudgeEnabled,
          email_nudge_time: emailNudgeTime,
          nudge_frequency: nudgeFrequency,
        })
        .eq("id", userId);

      if (profileError) throw profileError;

      toast({
        title: "Profile updated",
        description: "Your changes have been saved.",
      });

      onOpenChange(false);
    } catch (err: unknown) {
      console.error("Error saving profile:", err);
      const errorMessage = err instanceof Error ? err.message : "Please try again.";
      toast({
        title: "Error saving profile",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Profile Settings</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6 py-4">

            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How should we greet you?"
                autoComplete="name"
              />
            </div>

            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={userEmail}
                disabled
                className="opacity-60"
              />
            </div>

            {/* Theme Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isDark ? (
                  <Moon className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Sun className="w-4 h-4 text-muted-foreground" />
                )}
                <Label htmlFor="theme-toggle" className="cursor-pointer">
                  Dark Mode
                </Label>
              </div>
              <Switch
                id="theme-toggle"
                checked={isDark}
                onCheckedChange={handleThemeToggle}
              />
            </div>

            {/* Reminders Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground">Reminders</h3>
              
              {/* Free Option: Calendar Reminder */}
              <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <Label className="font-medium">Calendar Reminder</Label>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent-foreground font-medium">
                    Free
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  A simple reminder using your own calendar.
                </p>
                <CalendarReminderButton
                  source="profile"
                  timezone={timezone}
                  compact={true}
                />
              </div>

              {/* Premium Option: Email Nudges */}
              <div className={`space-y-3 p-4 rounded-lg border ${isPaid ? 'bg-muted/50 border-border' : 'bg-muted/20 border-border/50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <Label htmlFor="nudge-toggle" className={`font-medium ${!isPaid ? 'text-muted-foreground' : 'cursor-pointer'}`}>
                        Gentle Email Nudges
                      </Label>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                        Premium
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 pr-4">
                      {isPaid 
                        ? "The Dashboard checks in for you — without pressure, streaks, or guilt."
                        : "A quiet nudge to return to what matters. Available with Premium."
                      }
                    </p>
                  </div>
                  <Switch
                    id="nudge-toggle"
                    checked={isPaid ? emailNudgeEnabled : false}
                    onCheckedChange={isPaid ? setEmailNudgeEnabled : undefined}
                    disabled={!isPaid}
                    className={!isPaid ? 'opacity-50' : ''}
                  />
                </div>
                
                {isPaid && emailNudgeEnabled && (
                  <div className="space-y-4 pt-3 border-t border-border/50">
                    {/* Frequency selector */}
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">How often?</Label>
                      <RadioGroup 
                        value={nudgeFrequency} 
                        onValueChange={(value) => setNudgeFrequency(value as "daily" | "weekly")}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="daily" id="daily" />
                          <Label htmlFor="daily" className="cursor-pointer font-normal">
                            Daily
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="weekly" id="weekly" />
                          <Label htmlFor="weekly" className="cursor-pointer font-normal">
                            Weekly (Monday)
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Time selector - only show for daily nudges */}
                    {nudgeFrequency === "daily" && (
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">When works best?</Label>
                        <RadioGroup 
                          value={emailNudgeTime} 
                          onValueChange={(value) => setEmailNudgeTime(value as "morning" | "evening")}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="morning" id="morning" />
                            <Label htmlFor="morning" className="cursor-pointer font-normal">
                              Morning (7am)
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="evening" id="evening" />
                            <Label htmlFor="evening" className="cursor-pointer font-normal">
                              Evening (7pm)
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                    )}

                    {nudgeFrequency === "weekly" && (
                      <p className="text-xs text-muted-foreground italic">
                        One calm check-in per week, sent Monday at 7am your time.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Used for daily reset timing{emailNudgeEnabled ? " and email nudges" : ""}
              </p>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Billing */}
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                navigate("/billing");
              }}
              className="w-full"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Billing & Subscription
            </Button>

            {/* Sign Out */}
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="w-full text-muted-foreground hover:text-destructive"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
