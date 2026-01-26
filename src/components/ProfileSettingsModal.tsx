import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, LogOut, Moon, Sun, CreditCard } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ProfileSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
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
  onSignOut,
}: ProfileSettingsModalProps) {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [timezone, setTimezone] = useState("");
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
          .select("display_name")
          .eq("id", userId)
          .single();

        if (error && error.code !== "PGRST116") {
          console.error("Error fetching profile:", error);
        }

        if (data) {
          setDisplayName(data.display_name || "");
        }

        // Try to get timezone from reset_sessions (existing field)
        const { data: sessionData } = await supabase
          .from("reset_sessions")
          .select("timezone")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (sessionData?.timezone) {
          setTimezone(sessionData.timezone);
        } else {
          // Default to browser timezone
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

  const handleSave = async () => {
    if (!userId) return;

    setIsSaving(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ display_name: displayName.trim() || null })
        .eq("id", userId);

      if (profileError) throw profileError;

      toast({
        title: "Profile updated",
        description: "Your changes have been saved.",
      });

      onOpenChange(false);
    } catch (err: any) {
      console.error("Error saving profile:", err);
      toast({
        title: "Error saving profile",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Profile Settings</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Avatar placeholder */}
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center">
                <User className="w-8 h-8 text-accent" />
              </div>
            </div>

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
                Used for daily reset timing
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
              onClick={onSignOut}
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
