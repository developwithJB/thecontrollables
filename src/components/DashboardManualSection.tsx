import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BookOpen, 
  ChevronDown, 
  ChevronUp, 
  Target, 
  Zap, 
  Clock, 
  Shield, 
  Dumbbell, 
  MessageCircle,
  RotateCcw,
  Sparkles,
  Download,
  Share,
  ListChecks,
  Calendar,
  Flame
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { isStandalone, isIOS, hasDeferredPrompt, triggerInstallPrompt } from "@/lib/pwa";
import { toast } from "sonner";

interface ManualSection {
  title: string;
  icon: React.ElementType;
  description: string;
  howToUse: string;
}

const MANUAL_SECTIONS: ManualSection[] = [
  {
    title: "Today's Actions",
    icon: ListChecks,
    description: "Your daily checklist. A unified hub showing exactly what to do today—readings, time logs, and promises.",
    howToUse: "Tap any item to open its tool directly. Complete each action to earn XP. The list evolves based on your Foundation day."
  },
  {
    title: "Daily Check-In",
    icon: Calendar,
    description: "Your morning ritual. One question: what's your singular focus for today?",
    howToUse: "Check in each day to maintain your streak. Your focus anchors daily decisions."
  },
  {
    title: "Main Mission",
    icon: Target,
    description: "Your overarching intention—big-picture, meaningful, and user-defined. Like a personal quest category.",
    howToUse: "Tap the Mission card to set or edit. Choose your duration. Examples: Reclaim Energy, Build Discipline, Strengthen Focus."
  },
  {
    title: "7-Day Foundation",
    icon: RotateCcw,
    description: "Your starter block of action. A time-bound mini program that builds momentum under your Main Mission. The 'Foundation Focus' shows your current program.",
    howToUse: "Start a Foundation to build structured habits. Complete all 7 days to earn a certificate. Each day has a specific habit task from your chosen program."
  },
  {
    title: "Your Build",
    icon: Dumbbell,
    description: "Your current state across 5 dimensions: Awareness, Perspective, Habit, Wellness, and Environment.",
    howToUse: "Tap to view your Build scores. Take the assessment to discover your archetype. Re-scan as you grow."
  },
  {
    title: "Momentum (XP)",
    icon: Zap,
    description: "Points earned from completed actions. Tracks your consistency and engagement over time.",
    howToUse: "Complete AI-suggested actions and daily reps to earn XP. Watch your momentum build across the week."
  },
  {
    title: "Time Currency",
    icon: Clock,
    description: "A daily log of time invested vs. time wasted. Your most valuable resource tracked simply.",
    howToUse: "Tap to log your time. Be honest. Look for patterns in where your hours actually go."
  },
  {
    title: "Integrity Meter",
    icon: Shield,
    description: "Your ratio of promises kept to promises made. Self-trust built through small commitments.",
    howToUse: "Tap to make promises. Mark them complete when done. Your score reflects your word."
  },
  {
    title: "Streak & Level",
    icon: Flame,
    description: "Consecutive check-in days and your total XP level. Consistency builds momentum.",
    howToUse: "Check in daily to grow your streak. Watch the flame animate when you're on a roll."
  },
  {
    title: "The Controllables",
    icon: MessageCircle,
    description: "Five AI guides—one for each Controllable. Available with Full Access.",
    howToUse: "Ask questions when stuck. Each guide gives action-focused advice, not therapy. Use them as tools."
  },
  {
    title: "Experience Tab",
    icon: Sparkles,
    description: "Your full history: badges earned, progress over time, past Foundations, and momentum trends.",
    howToUse: "Check weekly to see patterns. Review past Foundations to remember what you've learned."
  },
  {
    title: "Install the App",
    icon: Download,
    description: "Add The Dashboard to your home screen for quick access. Works offline and launches like a native app.",
    howToUse: "On iPhone: tap Share → 'Add to Home Screen'. On Android/Desktop: tap the install prompt when it appears."
  }
];

export function DashboardManualSection() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  
  const visibleSections = isExpanded ? MANUAL_SECTIONS : MANUAL_SECTIONS.slice(0, 1);
  
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

  // Render install button for the Install section
  const renderInstallButton = () => {
    if (alreadyInstalled) {
      return (
        <div className="flex items-center gap-2 mt-3 text-xs text-green-600 dark:text-green-400">
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
          className="mt-3 text-xs h-8"
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
        className="mt-3 text-xs h-8"
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
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-4 h-4 text-primary" />
        <h2 className="font-display text-lg font-semibold text-foreground">
          The Manual for The Dashboard
        </h2>
      </div>
      
      <p className="text-sm text-muted-foreground mb-6">
        How to use each part of your life dashboard.
      </p>

      {/* Manual Sections */}
      <div className="space-y-3">
        <AnimatePresence mode="wait">
          {visibleSections.map((section, index) => {
            const IconComponent = section.icon;
            const isInstallSection = section.title === "Install the App";
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, delay: index * 0.03 }}
                className="p-4 rounded-xl bg-card border transition-colors hover:border-primary/30"
              >
                {/* Section Header */}
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <IconComponent className="w-4 h-4" />
                  </span>
                  
                  <div className="flex-1 min-w-0">
                    {/* Title */}
                    <p className="font-display font-medium text-foreground text-sm leading-snug mb-2">
                      {section.title}
                    </p>
                    
                    {/* Description */}
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                      {section.description}
                    </p>
                    
                    {/* How to Use */}
                    <div className="flex items-start gap-2 pt-2 border-t border-border/50">
                      <span className="text-primary text-xs">→</span>
                      <p className="text-xs text-foreground/80 italic">
                        {section.howToUse}
                      </p>
                    </div>

                    {/* Install Button - only for Install section */}
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
            Show Less
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4 mr-2" />
            See All {MANUAL_SECTIONS.length} Sections
          </>
        )}
      </Button>

      {/* Footer - only show when expanded */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-6 p-4 rounded-xl bg-muted/30 border-l-2 border-primary/50">
              <p className="text-xs text-muted-foreground italic leading-relaxed">
                The Dashboard is a companion, not a replacement for action. 
                Use these tools to track, reflect, and adjust—but the real work happens offline.
                Keep it simple. Do the reps.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
