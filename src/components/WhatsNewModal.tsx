import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Sparkles, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { APP_VERSION } from "@/lib/version";

// Changelog entries - update this with each version
const CHANGELOG: Record<string, { title: string; items: string[] }> = {
  "2.2.0": {
    title: "Your Formation Path, Every Morning",
    items: [
      "Choose Read Along, 40-Day Charge, or Fully Charged 75 during a faster first-time setup",
      "Turn on a 7:00 AM formation email as you choose your path",
      "Open each morning to your day, season, Five Circuits, and first honest move",
      "Change your path or morning email rhythm anytime without losing private progress",
    ],
  },
  "2.1.0": {
    title: "Today's Covenant & Lifetime Evidence",
    items: [
      "Your Covenant now leads the day with the promises you have already kept",
      "Begin a complete 75-day Christian challenge built around prayer, Scripture, discipline, training, and service",
      "Proof is now Evidence — a lifetime museum of faithful obedience instead of another streak screen",
      "Evidence of Grace records answered prayer, shaping Scripture, milestones, testimony, and people impacted",
      "Daily emails celebrate identity before presenting today's mission",
    ],
  },
  "2.0.0": {
    title: "Predictive Intelligence, Adaptive Modes & Automations",
    items: [
      "The app now predicts drift, burnout, and opportunity windows before they happen",
      "Adaptive Modes — Focus, Recovery, Maintenance, Social, Travel — reshape the dashboard to match your state",
      "One-tap automations: lighten your day, prep tomorrow, build a focus block, and more",
      "Predictions are grounded in your real data, not generic advice",
      "Manual mode override always respected — you stay in control",
    ],
  },
  "1.9.0": {
    title: "System Intelligence",
    items: [
      "The app now quietly learns from your patterns — no extra work required",
      "\"The system noticed...\" cards surface only when they can help your planning",
      "Confirm or dismiss observations with a single tap",
      "View what the system has learned in Profile Settings",
      "Operator Console now uses your behavioral patterns to improve suggestions",
    ],
  },
  "1.8.0": {
    title: "Operator Console",
    items: [
      "New Operator Console — see your best next move without typing",
      "Structured AI suggestions: Plan, Focus, Recovery, Review modes",
      "One-tap actions with deep links to Planner, Snapshot, Money, and more",
      "Command shortcuts: 'replan my day', 'simplify today', 'I feel off'",
      "Chat mode still available via 'Talk it through' — now secondary",
    ],
  },
  "1.7.0": {
    title: "Integration Hub",
    items: [
      "New Integration Hub — connect Google Calendar, Gmail, Todoist, and Notion",
      "Sync calendar events and tasks directly into your Planner",
      "Gmail inbox summary powers your Daily OS (read-only, no content stored)",
      "Export weekly reviews and Vault entries to Notion",
      "All provider health visible from one page — connect, sync, disconnect",
    ],
  },
  "1.6.1": {
    title: "Money Hub",
    items: [
      "New Money Hub — track bills, subscriptions, budgets, and savings goals",
      "CSV import for bank transactions",
      "Financial Controllables summary with actionable insights",
      "Dashboard card shows what's due and where you stand",
    ],
  },
  "1.4.0": {
    title: "Daily Alignment",
    items: [
      "Daily Alignment — personalized scripture and reflection delivered each morning",
      "Built from your actual Snapshot data and Build scores",
      "Enable it in Profile Settings under Reminders",
    ],
  },
  "1.3.2": {
    title: "Checkout & Stability",
    items: [
      "Fixed subscription checkout flow",
      "Improved Today's Actions clickability",
      "Better collapsible section handling",
      "Streamlined upgrade experience",
    ],
  },
  "1.3.1": {
    title: "Focus & Polish",
    items: [
      "Enhanced Snapshot selector with recommendations",
      "Improved time reflection logging",
      "Better mobile PWA experience",
    ],
  },
  "1.3.0": {
    title: "Snapshots System",
    items: [
      "New 7-Day Snapshot framework",
      "Custom Snapshot creation",
      "Snapshot history & certificates",
    ],
  },
};

const WHATS_NEW_KEY = "whats_new_last_seen";

export function WhatsNewModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentChangelog, setCurrentChangelog] = useState<{ title: string; items: string[] } | null>(null);

  useEffect(() => {
    const lastSeenVersion = localStorage.getItem(WHATS_NEW_KEY);
    
    // Only show if user has seen a previous version and current version has changelog
    if (lastSeenVersion && lastSeenVersion !== APP_VERSION && CHANGELOG[APP_VERSION]) {
      setCurrentChangelog(CHANGELOG[APP_VERSION]);
      setIsOpen(true);
    }
    
    // Always update stored version
    localStorage.setItem(WHATS_NEW_KEY, APP_VERSION);
  }, []);

  const handleDismiss = () => {
    setIsOpen(false);
  };

  if (!currentChangelog) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            What's New in v{APP_VERSION}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <h3 className="text-sm font-medium text-foreground mb-3">
            {currentChangelog.title}
          </h3>
          
          <ul className="space-y-2">
            {currentChangelog.items.map((item, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>{item}</span>
              </motion.li>
            ))}
          </ul>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleDismiss} size="sm">
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Manual trigger component for Guide tab
export function WhatsNewTrigger() {
  const [isOpen, setIsOpen] = useState(false);
  const changelog = CHANGELOG[APP_VERSION];

  if (!changelog) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
      >
        <Sparkles className="w-3 h-3" />
        <span>What's new in v{APP_VERSION}</span>
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              What's New in v{APP_VERSION}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <h3 className="text-sm font-medium text-foreground mb-3">
              {changelog.title}
            </h3>
            
            <ul className="space-y-2">
              {changelog.items.map((item, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </motion.li>
              ))}
            </ul>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setIsOpen(false)} size="sm">
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
