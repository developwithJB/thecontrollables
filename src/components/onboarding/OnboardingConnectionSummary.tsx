import { motion } from "framer-motion";
import { Check, Calendar, Activity, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OnboardingConnectionSummaryProps {
  calendarConnected: boolean;
  wearableConnected: boolean;
  wearableProvider?: string;
  onContinue: () => void;
}

const items = [
  {
    key: "calendar",
    label: "Google Calendar",
    icon: Calendar,
    description: "Reads your planned week, writes Snapshot actions back",
    skippedNote: "not connected yet (add in Settings)",
  },
  {
    key: "wearable",
    icon: Activity,
    description: "Pulls daily recovery each morning to show Plan vs. Actual",
    skippedNote: "not connected yet (add in Settings)",
  },
] as const;

export function OnboardingConnectionSummary({
  calendarConnected,
  wearableConnected,
  wearableProvider,
  onContinue,
}: OnboardingConnectionSummaryProps) {
  const connected = { calendar: calendarConnected, wearable: wearableConnected };

  const wearableLabel = wearableProvider
    ? wearableProvider.charAt(0).toUpperCase() + wearableProvider.slice(1)
    : "Wearable";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex min-h-screen items-center justify-center px-4"
    >
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            You're all set
          </h1>
          <p className="text-sm text-muted-foreground">
            Here's what The Dashboard will do with your connections.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card text-card-foreground overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr] text-xs font-medium text-muted-foreground border-b border-border">
            <div className="px-4 py-2.5 text-left">What you connected</div>
            <div className="px-4 py-2.5 text-left">What The Dashboard does</div>
          </div>

          {items.map((item) => {
            const isConnected = connected[item.key];
            const label = item.key === "wearable" ? wearableLabel : item.label;
            const Icon = item.icon;

            return (
              <div
                key={item.key}
                className="grid grid-cols-[1fr_1fr] border-b border-border last:border-b-0"
              >
                <div className="flex items-center gap-2 px-4 py-3 text-left">
                  {isConnected ? (
                    <>
                      <Check className="h-4 w-4 shrink-0 text-green-500" />
                      <span className="text-sm font-medium text-foreground">
                        {label}
                      </span>
                    </>
                  ) : (
                    <>
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                      <span className="text-sm text-muted-foreground">
                        {label} — {item.skippedNote}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center px-4 py-3 text-left">
                  <span
                    className={
                      isConnected
                        ? "text-sm text-foreground"
                        : "text-sm text-muted-foreground/60 italic"
                    }
                  >
                    {item.description}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <Button size="lg" className="w-full gap-2" onClick={onContinue}>
          Show me my dashboard
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
