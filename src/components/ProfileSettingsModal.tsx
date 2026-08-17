import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Moon, Sun, CreditCard, Mail, Calendar, Bell, Plug } from "lucide-react";
import { isPushSupported, isPushSubscribed, subscribeToPush, unsubscribeFromPush } from "@/lib/pushNotifications";
import { ObservationsSettingsCard } from "@/components/settings/ObservationsSettingsCard";
import { AISettingsCard } from "@/components/settings/AISettingsCard";
import { useObservations } from "@/hooks/useObservations";
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
import { getStoredThemePreference, setThemePreference } from "@/lib/theme";

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

type NudgeFrequency = "off" | "daily" | "weekly";

export function ProfileSettingsModal({
  open,
  onOpenChange,
  userId,
  userEmail,
}: ProfileSettingsModalProps) {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [timezone, setTimezone] = useState("");
  const [nudgeFrequency, setNudgeFrequency] = useState<NudgeFrequency>("off");
  const [formationEmailOptInAt, setFormationEmailOptInAt] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDark, setIsDark] = useState(true);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushToggling, setPushToggling] = useState(false);
  
  const { toast } = useToast();

  const { observations, inferredPreferences, dismissObservation } = useObservations(userId);

  // Detect initial theme + push support
  useEffect(() => {
    setIsDark(getStoredThemePreference() === "dark");
    setPushSupported(isPushSupported());
    if (isPushSupported()) {
      isPushSubscribed().then(setPushEnabled);
    }
  }, [open]);

  // Fetch profile on open
  useEffect(() => {
    if (!open || !userId) return;

    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("display_name, timezone, email_nudge_enabled, nudge_frequency, formation_email_opt_in_at")
          .eq("id", userId)
          .single();

        if (error && error.code !== "PGRST116") {
          console.error("Error fetching profile:", error);
        }

        if (data) {
          setDisplayName(data.display_name || "");
          setFormationEmailOptInAt(data.formation_email_opt_in_at || null);
          
          // Map legacy email_nudge_enabled + nudge_frequency to new single frequency
          if (!data.email_nudge_enabled) {
            setNudgeFrequency("off");
          } else {
            setNudgeFrequency((data.nudge_frequency as NudgeFrequency) || "daily");
          }
          
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
    setThemePreference(newIsDark ? "dark" : "light");
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
      // Map new frequency to legacy fields
      const emailNudgeEnabled = nudgeFrequency !== "off";
      const dbNudgeFrequency = nudgeFrequency === "off" ? "daily" : nudgeFrequency;
      const nextFormationEmailOptInAt = emailNudgeEnabled
        ? formationEmailOptInAt || new Date().toISOString()
        : null;

      // Update profile with all settings
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          display_name: displayName.trim() || null,
          timezone: timezone,
          email_nudge_enabled: emailNudgeEnabled,
          nudge_frequency: dbNudgeFrequency,
          formation_email_opt_in_at: nextFormationEmailOptInAt,
        })
        .eq("id", userId);

      if (profileError) throw profileError;
      setFormationEmailOptInAt(nextFormationEmailOptInAt);

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

              {/* Push Notifications - Free, only when supported */}
              {pushSupported && (
                <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-muted-foreground" />
                      <Label htmlFor="push-toggle" className="font-medium cursor-pointer">
                        Push Reminders
                      </Label>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent-foreground font-medium">
                        Free
                      </span>
                    </div>
                    <Switch
                      id="push-toggle"
                      checked={pushEnabled}
                      disabled={pushToggling}
                      onCheckedChange={async (checked) => {
                        setPushToggling(true);
                        try {
                          if (checked) {
                            const success = await subscribeToPush();
                            setPushEnabled(success);
                            if (!success) {
                              toast({
                                title: "Push notifications blocked",
                                description: "Please allow notifications in your browser settings.",
                                variant: "destructive",
                              });
                            }
                          } else {
                            await unsubscribeFromPush();
                            setPushEnabled(false);
                          }
                        } finally {
                          setPushToggling(false);
                        }
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    A quiet nudge on your device. No email, no guilt.
                  </p>
                </div>
              )}

              {/* Formation email */}
              <div className="space-y-3 rounded-lg border border-cyan-400/20 bg-cyan-400/[0.05] p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="h-4 w-4 text-cyan-300" />
                  <Label className="font-medium">
                    Morning formation email
                  </Label>
                </div>
                <p className="mb-3 text-xs leading-5 text-muted-foreground">
                  Your selected path, five Controllables, and first honest move arrive around 7:00 AM in your timezone. Turn it off anytime.
                </p>
                <RadioGroup
                  value={nudgeFrequency}
                  onValueChange={(value) => setNudgeFrequency(value as NudgeFrequency)}
                  className="grid gap-2 sm:grid-cols-3"
                >
                  {[
                    ["daily", "Every morning"],
                    ["weekly", "Mondays only"],
                    ["off", "Off"],
                  ].map(([value, label]) => (
                    <div key={value} className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 ${nudgeFrequency === value ? "border-cyan-400/35 bg-cyan-400/10" : "border-border/60 bg-background/35"}`}>
                      <RadioGroupItem value={value} id={`nudge-${value}`} />
                      <Label htmlFor={`nudge-${value}`} className="cursor-pointer text-xs font-medium">
                        {label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                {nudgeFrequency !== "off" ? (
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
                    {nudgeFrequency === "daily" ? "Next email: tomorrow morning" : "Next email: Monday morning"}
                  </div>
                ) : null}
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
                Used for daily reset timing{nudgeFrequency !== "off" || pushEnabled ? " and reminders" : ""}
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

            {/* Daily Operator AI Settings */}
            <AISettingsCard userId={userId} onRevisitStart={() => onOpenChange(false)} />

            {/* System Intelligence Settings */}
            <ObservationsSettingsCard
              observations={observations}
              inferredPreferences={inferredPreferences}
              onDismiss={dismissObservation}
            />

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Integrations - inline section */}
            <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <Plug className="w-4 h-4 text-muted-foreground" />
                <Label className="font-medium">Connections</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Connect external services to enhance your experience.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  navigate("/integrations");
                }}
                className="w-full"
              >
                <Plug className="w-4 h-4 mr-2" />
                Manage Connections
              </Button>
            </div>

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
