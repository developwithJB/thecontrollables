import { useRef } from "react";
import { motion } from "framer-motion";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface QuestCardProps {
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
  onClose?: () => void;
}

export function QuestCard({ activeQuest, currentResetDay, todayReading, onClose }: QuestCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleDownload = async () => {
    try {
      const html2canvas = (await import("html2canvas")).default;
      if (!cardRef.current) return;

      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 3,
      });

      const link = document.createElement("a");
      link.download = "quest-card.png";
      link.href = canvas.toDataURL("image/png");
      link.click();

      toast({
        title: "Quest card saved",
        description: "Perfect for your lock screen or desk!",
      });
      onClose?.();
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download failed",
        description: "Could not generate image. Try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* The downloadable card */}
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative p-8 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-accent/30 shadow-2xl overflow-hidden"
        style={{ minHeight: "400px", maxWidth: "320px", margin: "0 auto" }}
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-accent/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-amber-500/10 to-transparent rounded-full blur-2xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />

        {/* Content */}
        <div className="relative flex flex-col h-full min-h-[360px]">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-accent/20 border border-accent/30 mb-3">
              <span className="text-xs font-medium text-accent uppercase tracking-wider">
                The Controllables
              </span>
            </div>
            {currentResetDay && (
              <p className="text-xs text-slate-400">
                Day {currentResetDay} of 7
              </p>
            )}
          </div>

          {/* Main Focus */}
          {todayReading && (
            <div className="flex-1 flex flex-col items-center justify-center text-center mb-6">
              <span className="text-5xl mb-4">{todayReading.emoji}</span>
              <h2 className="text-lg font-display font-bold text-white mb-2 capitalize">
                {todayReading.controllable}
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed px-2">
                {todayReading.quest_action}
              </p>
            </div>
          )}

          {/* Quest Info */}
          {activeQuest && (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🎯</span>
                <span className="text-xs text-slate-400 uppercase tracking-wide">Current Focus</span>
              </div>
              <p className="text-sm font-medium text-white">
                {activeQuest.title}
              </p>
            </div>
          )}

          {/* Motivational footer */}
          <div className="text-center pt-4 border-t border-white/10">
            <p className="text-xs text-slate-500 italic">
              "Real change happens away from the screen."
            </p>
          </div>

          {/* Branding */}
          <div className="text-center mt-4">
            <p className="text-[10px] text-slate-600">
              thedashboard.agbcoaching.com
            </p>
          </div>
        </div>
      </motion.div>

      {/* Download button */}
      <Button
        onClick={handleDownload}
        className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
      >
        <Download className="w-4 h-4 mr-2" />
        Download for Lock Screen
      </Button>
    </div>
  );
}