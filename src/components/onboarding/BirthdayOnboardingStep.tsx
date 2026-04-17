import { CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BirthdayOnboardingStepProps {
  birthday: string;
  onBirthdayChange: (value: string) => void;
}

export function BirthdayOnboardingStep({
  birthday,
  onBirthdayChange,
}: BirthdayOnboardingStepProps) {
  const today = new Date().toLocaleDateString("sv-SE");

  return (
    <div className="space-y-6">
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
        <CalendarDays className="h-5 w-5 text-primary" />
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Birthday-Led Start
        </p>
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Start with your birthday
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          We’ll use it to place today in context and shape a more grounded starting point.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="birthday">Your birthday</Label>
        <Input
          id="birthday"
          type="date"
          value={birthday}
          max={today}
          onChange={(event) => onBirthdayChange(event.target.value)}
          className="h-12 text-base"
        />
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
        <p className="text-xs leading-relaxed text-muted-foreground">
          This stays on this device until you create an account.
        </p>
      </div>
    </div>
  );
}
