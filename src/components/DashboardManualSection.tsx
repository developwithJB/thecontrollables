import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BookOpen, 
  ChevronDown, 
  ChevronUp, 
  ListChecks,
  RotateCcw,
  MessageCircle,
  Dumbbell,
  Sparkles,
  Clock,
  Shield,
  Download,
  Share,
  Orbit,
  FolderKanban,
  Calendar,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { isStandalone, isIOS, hasDeferredPrompt, triggerInstallPrompt } from "@/lib/pwa";
import { toast } from "sonner";

interface ManualSection {
  title: string;
  icon: React.ElementType;
  description: string;
}

interface HierarchyItem {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  description: string;
}

// Hierarchy explanation: Season → Project → Calendar → Task → Actuals
const HIERARCHY_ITEMS: HierarchyItem[] = [
  {
    title: "Season",
    subtitle: "Life Arc",
    icon: Orbit,
    description: "Your life chapter — the big picture arc you're living in right now.",
  },
  {
    title: "Chapter",
    subtitle: "Building",
    icon: FolderKanban,
    description: "What you're building within this season. Intention containers.",
  },
  {
    title: "Calendar Block",
    subtitle: "When",
    icon: Calendar,
    description: "When you're doing it. Blocks of time allocated to projects.",
  },
  {
    title: "Task",
    subtitle: "What",
    icon: ListChecks,
    description: "What specifically happens in each block. The action.",
  },
  {
    title: "Actuals",
    subtitle: "Body + Data",
    icon: Activity,
    description: "What your body and behavior recorded. The truth layer.",
  },
];

// Simplified to 5 core items
const CORE_SECTIONS: ManualSection[] = [
  {
    title: "Today's Actions",
    icon: ListChecks,
    description: "Your daily checklist—complete each task to earn XP and stay on track.",
  },
  {
    title: "7-Day Snapshot",
    icon: RotateCcw,
    description: "A weekly focus with themed daily tasks. Complete all 7 days to earn a certificate.",
  },
  {
    title: "The Controllables",
    icon: MessageCircle,
    description: "Five guides to help when you're stuck. Ask a question, get one action.",
  },
  {
    title: "Your Build",
    icon: Dumbbell,
    description: "Your scores across 5 dimensions. Answer a few questions to see where to grow.",
  },
  {
    title: "Growth & Experience",
    icon: Sparkles,
    description: "Your self-leadership progress: badges, rings, past Snapshots, and momentum trends.",
  },
];

// Extended sections for those who want more detail
const EXTENDED_SECTIONS: ManualSection[] = [
  {
    title: "Time Reflection",
    icon: Clock,
    description: "Rate yesterday's focus on a simple slider. Notice patterns in how present you were.",
  },
  {
    title: "Integrity Meter",
    icon: Shield,
    description: "Track promises kept vs. made. Build self-trust through small commitments.",
  },
  {
    title: "Install the App",
    icon: Download,
    description: "Add to your home screen for quick access. Works offline like a native app.",
  },
];

export function DashboardManualSection() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  
  const visibleSections = isExpanded ? [...CORE_SECTIONS, ...EXTENDED_SECTIONS] : CORE_SECTIONS;
  
  const alreadyInstalled = isStandalone();
  const isiOSDevice = isIOS();
  const canInstall = hasDeferredPrompt();

  const handleInstallClick = async () => {
    if (alreadyInstalled) {
      toast.success("Already installed!", { description: "The Dashboard is on your home screen." });
      return;
    }

    if (isiOSDevice) {
      toast.info("Tap Share, then 'Add to Home Screen'", { 
        description: "Use the share button in Safari to install.",
        duration: 5000
      });
      return;
    }

    if (canInstall) {
      setIsInstalling(true);
      const result = await triggerInstallPrompt();
      setIsInstalling(false);
      
      if (result === 'accepted') {
        toast.success("Installing The Dashboard!");
      } else if (result === 'dismissed') {
        toast.info("No problem—you can install anytime from browser menu.");
      }
    } else {
      toast.info("Install from browser menu", {
        description: "Use your browser's menu to add to home screen.",
        duration: 4000
      });
    }
  };

  const renderInstallButton = () => {
    if (alreadyInstalled) {
      return (
        <div className="flex items-center gap-2 mt-2 text-xs text-green-600 dark:text-green-400">
          <Download className="w-3 h-3" />
          <span>Already installed</span>
        </div>
      );
    }

    if (isiOSDevice) {
      return (
        <Button
          size="sm"
          variant="outline"
          onClick={handleInstallClick}
          className="mt-2 text-xs h-7"
        >
          <Share className="w-3 h-3 mr-1.5" />
          How to Install
        </Button>
      );
    }

    return (
      <Button
        size="sm"
        onClick={handleInstallClick}
        disabled={isInstalling}
        className="mt-2 text-xs h-7"
      >
        <Download className="w-3 h-3 mr-1.5" />
        {isInstalling ? "Installing..." : "Install Now"}
      </Button>
    );
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="mb-8"
    >
      {/* How This Works - Hierarchy Section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-4 h-4 text-primary" />
          <h2 className="font-display text-lg font-semibold text-foreground">
            How This Works
          </h2>
        </div>
        
        <div className="space-y-3 mb-4">
          {HIERARCHY_ITEMS.map((item, index) => {
            const IconComponent = item.icon;
            return (
              <div
                key={item.title}
                className="p-3 rounded-xl bg-card border transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <IconComponent className="w-3.5 h-3.5" />
                  </span>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-display font-medium text-foreground text-sm leading-snug">
                        {item.title}
                      </p>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {item.subtitle}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <p className="text-xs text-muted-foreground text-center">
          Season sets the arc. Projects hold your intent. The rest flows from there.
        </p>
      </div>

      {/* Section Header */}
      <div className="flex items-center gap-2 mb-4">
        <ListChecks className="w-4 h-4 text-primary" />
        <h2 className="font-display text-lg font-semibold text-foreground">
          Quick Reference
        </h2>
      </div>
      
      <p className="text-sm text-muted-foreground mb-6">
        The five core tools of your dashboard.
      </p>

      {/* Manual Sections */}
      <div className="space-y-3">
        <AnimatePresence mode="wait">
          {visibleSections.map((section, index) => {
            const IconComponent = section.icon;
            const isInstallSection = section.title === "Install the App";
            
            return (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, delay: index * 0.03 }}
                className="p-3 rounded-xl bg-card border transition-colors hover:border-primary/30"
              >
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <IconComponent className="w-3.5 h-3.5" />
                  </span>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-medium text-foreground text-sm leading-snug">
                      {section.title}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                      {section.description}
                    </p>
                    {isInstallSection && renderInstallButton()}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Expand/Collapse Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full mt-4 text-muted-foreground hover:text-foreground"
      >
        {isExpanded ? (
          <>
            <ChevronUp className="w-4 h-4 mr-2" />
            Show Core 5
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4 mr-2" />
            See All Tools
          </>
        )}
      </Button>
    </motion.div>
  );
}
