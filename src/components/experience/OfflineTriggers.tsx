import { motion } from "framer-motion";
import { Smartphone, Printer, Share2, Bell, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

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

  const handleLockScreenReminder = () => {
    // Create a simple reminder text that can be copied
    const reminderText = todayReading 
      ? `${todayReading.emoji} ${todayReading.controllable}: ${todayReading.quest_action}`
      : activeQuest?.title || "Stay focused on what you can control";
    
    navigator.clipboard.writeText(reminderText);
    toast({
      title: "Copied to clipboard",
      description: "Add this as a reminder or lock screen widget",
    });
  };

  const handlePrintQuestCard = () => {
    const questContent = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       THE CONTROLLABLES
         Quest Card
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${activeQuest ? `🎯 MAIN QUEST: ${activeQuest.title}` : "No active quest"}

${todayReading ? `
${todayReading.emoji} TODAY'S FOCUS: ${todayReading.controllable}

ACTION: ${todayReading.quest_action}
` : ""}

${currentResetDay ? `📅 Reset Day: ${currentResetDay}/7` : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    Real change happens
    away from the screen.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `;
    
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Quest Card - The Controllables</title>
            <style>
              body {
                font-family: 'Courier New', monospace;
                padding: 40px;
                max-width: 400px;
                margin: 0 auto;
                white-space: pre-wrap;
                line-height: 1.6;
              }
              @media print {
                body { padding: 20px; }
              }
            </style>
          </head>
          <body>${questContent}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleShareSummary = async () => {
    const summary = `🎮 The Controllables

${activeQuest ? `🎯 Quest: ${activeQuest.title}` : ""}
${currentResetDay ? `📅 Reset Day ${currentResetDay}/7` : ""}
${todayReading ? `${todayReading.emoji} Focus: ${todayReading.controllable}` : ""}

Control what you can. Accept what you can't.

thecontrollables.lovable.app`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "My Controllables Journey",
          text: summary,
          url: "https://thecontrollables.lovable.app",
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="rounded-2xl border bg-card/50 backdrop-blur-sm overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-gradient-to-r from-amber-500/10 to-transparent">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Bell className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">Offline Triggers</h3>
            <p className="text-xs text-muted-foreground">Real change happens away from the screen</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-2">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLockScreenReminder}
          className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground text-sm">Lock Screen Reminder</p>
            <p className="text-xs text-muted-foreground">Copy today's focus for your phone</p>
          </div>
          <Download className="w-4 h-4 text-muted-foreground" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={handlePrintQuestCard}
          className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Printer className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground text-sm">Print Quest Card</p>
            <p className="text-xs text-muted-foreground">Physical reminder for your desk</p>
          </div>
          <ExternalLink className="w-4 h-4 text-muted-foreground" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleShareSummary}
          className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
            <Share2 className="w-5 h-5 text-green-500" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground text-sm">Share Journey</p>
            <p className="text-xs text-muted-foreground">Send your quest summary</p>
          </div>
          <ExternalLink className="w-4 h-4 text-muted-foreground" />
        </motion.button>
      </div>
    </motion.div>
  );
}
