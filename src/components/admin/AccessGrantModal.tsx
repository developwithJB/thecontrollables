import { useState } from "react";
import { Calendar, Clock, Crown, Infinity } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type AccessDuration = {
  type: "months" | "year" | "lifetime";
  months?: number;
};

interface AccessGrantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
  onGrant: (duration: AccessDuration) => void;
  isLoading: boolean;
}

export function AccessGrantModal({
  open,
  onOpenChange,
  userEmail,
  onGrant,
  isLoading,
}: AccessGrantModalProps) {
  const [durationType, setDurationType] = useState<"months" | "year" | "lifetime">("year");
  const [monthsCount, setMonthsCount] = useState<string>("3");

  const handleGrant = () => {
    const duration: AccessDuration = { type: durationType };
    if (durationType === "months") {
      duration.months = parseInt(monthsCount, 10);
    }
    onGrant(duration);
  };

  const getExpiryPreview = () => {
    const now = new Date();
    if (durationType === "lifetime") {
      return "Never expires";
    }
    
    let expiryDate = new Date(now);
    if (durationType === "months") {
      expiryDate.setMonth(expiryDate.getMonth() + parseInt(monthsCount, 10));
    } else if (durationType === "year") {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    }
    
    return `Expires: ${expiryDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Grant Access
          </DialogTitle>
          <DialogDescription>
            Grant paid access to <span className="font-medium">{userEmail}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <RadioGroup
            value={durationType}
            onValueChange={(v) => setDurationType(v as typeof durationType)}
            className="space-y-3"
          >
            {/* Months Option */}
            <div className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="months" id="months" />
              <Label htmlFor="months" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Custom months</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Grant access for a specific number of months
                </p>
              </Label>
            </div>

            {/* Year Option */}
            <div className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="year" id="year" />
              <Label htmlFor="year" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">1 Year</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Grant access for 12 months
                </p>
              </Label>
            </div>

            {/* Lifetime Option */}
            <div className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="lifetime" id="lifetime" />
              <Label htmlFor="lifetime" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Infinity className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Lifetime</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Permanent access, never expires
                </p>
              </Label>
            </div>
          </RadioGroup>

          {/* Months Selector - Only show when months type selected */}
          {durationType === "months" && (
            <div className="space-y-2">
              <Label htmlFor="months-count">Number of months</Label>
              <Select value={monthsCount} onValueChange={setMonthsCount}>
                <SelectTrigger id="months-count">
                  <SelectValue placeholder="Select months" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                    <SelectItem key={m} value={m.toString()}>
                      {m} {m === 1 ? "month" : "months"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Expiry Preview */}
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-sm text-muted-foreground">
              {getExpiryPreview()}
            </p>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleGrant} disabled={isLoading}>
            {isLoading ? "Granting..." : "Grant Access"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
