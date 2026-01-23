import { useState } from "react";
import { motion } from "framer-motion";
import { Smartphone, Share2, Bell, Download, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { QuestCard } from "./QuestCard";
import { CollapsibleCard } from "./CollapsibleCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface OfflineTriggersProps {
  activeQuest?: {
    title: string;
    duration_days: number;
  } | null;
  currentResetDay?: number;
  todayReading?: {
    controllable: string;
    emoji: string;
    quest_action: string;
  } | null;
}

export function OfflineTriggers({ activeQuest, currentResetDay, todayReading }: OfflineTriggersProps) {
  const { toast } = useToast();
  const [showQuestCard, setShowQuestCard] = useState(false);

  const handleShareJourney = async () => {
    const summary = `🎮 The Controllables

${activeQuest ? `🎯 Quest: ${activeQuest.title}` : ""}
${currentResetDay ? `📅 Reset Day ${currentResetDay}/7` : ""}
${todayReading ? `${todayReading.emoji} Focus: ${todayReading.controllable}

Today's Action: ${todayReading.quest_action}` : ""}

Control what you can. Accept what you can't.

thedashboard.agbcoaching.com`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "My Controllables Journey",
          text: summary,
          url: "https://thedashboard.agbcoaching.com",
        });
      } catch {
        navigator.clipboard.writeText(summary);
        toast({
          title: "Copied to clipboard",
          description: "Share your journey with others",
        });
      }
    } else {
      navigator.clipboard.writeText(summary);
      toast({
        title: "Copied to clipboard",
        description: "Share your journey with others",
      });
    }
  };

  return (
    <>
      <CollapsibleCard
        icon={
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Bell className="w-4 h-4 text-amber-500" />
          </div>
        }
        title="Offline Triggers"
        subtitle="Real change happens away from the screen"
        headerGradient="bg-gradient-to-r from-amber-500/10 to-transparent"
        defaultOpen={false}
      >
        <div className="p-4 space-y-2">
          {/* Lock Screen / Print Card - Download */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowQuestCard(true)}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center group-hover:bg-accent/30 transition-colors">
              <Smartphone className="w-5 h-5 text-accent" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground text-sm">Lock Screen / Print Card</p>
              <p className="text-xs text-muted-foreground">Download your daily focus card</p>
            </div>
            <Download className="w-4 h-4 text-accent" />
          </motion.button>

          {/* Share Journey - Copy Text */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleShareJourney}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
              <Share2 className="w-5 h-5 text-green-500" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground text-sm">Share Journey</p>
              <p className="text-xs text-muted-foreground">Copy your quest summary to share</p>
            </div>
            <Copy className="w-4 h-4 text-green-500" />
          </motion.button>
        </div>
      </CollapsibleCard>

      {/* Quest Card Modal */}
      <Dialog open={showQuestCard} onOpenChange={setShowQuestCard}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center font-display">Your Quest Card</DialogTitle>
          </DialogHeader>
          <QuestCard
            activeQuest={activeQuest}
            currentResetDay={currentResetDay}
            todayReading={todayReading}
            onClose={() => setShowQuestCard(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}