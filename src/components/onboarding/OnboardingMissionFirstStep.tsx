import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Compass } from "lucide-react";

interface OnboardingMissionFirstStepProps {
  mission: string;
  onMissionChange: (value: string) => void;
  onContinue: () => void;
}

export function OnboardingMissionFirstStep({
  mission,
  onMissionChange,
  onContinue,
}: OnboardingMissionFirstStepProps) {
  return (
    <div className="min-h-screen bg-background p-6 flex items-center justify-center">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 space-y-4">
        <div className="inline-flex p-2 rounded-lg bg-primary/10">
          <Compass className="w-5 h-5 text-primary" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">What matters most right now?</h1>
        <p className="text-sm text-muted-foreground">
          Pick one mission for today. You can change it later.
        </p>

        <Input
          value={mission}
          onChange={(e) => onMissionChange(e.target.value)}
          placeholder="Example: Show up for my morning workout"
          maxLength={120}
        />

        <Button className="w-full" onClick={onContinue} disabled={!mission.trim()}>
          Continue
        </Button>
      </div>
    </div>
  );
}
