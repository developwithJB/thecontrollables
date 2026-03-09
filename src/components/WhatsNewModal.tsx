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
