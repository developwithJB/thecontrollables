import { useRef } from "react";
import { motion } from "framer-motion";
import { Share2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getArchetypeInfo, getArchetypeThemeColors, type UserBuildCurrent } from "@/lib/build";

interface BuildCardProps {
  build: UserBuildCurrent;
}

const STATS = [
  { key: "awareness", label: "Awareness", emoji: "🦉", color: "from-amber-500 to-amber-600" },
  { key: "perspective", label: "Perspective", emoji: "🐢", color: "from-emerald-500 to-emerald-600" },
  { key: "habit", label: "Habit", emoji: "🦈", color: "from-blue-500 to-blue-600" },
  { key: "wellness", label: "Wellness", emoji: "🛰️", color: "from-violet-500 to-violet-600" },
  { key: "environment", label: "Environment", emoji: "🚀", color: "from-rose-500 to-rose-600" },
] as const;

export function BuildCard({ build }: BuildCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const archetypeInfo = getArchetypeInfo(build.build_archetype_key);
  const themeColors = getArchetypeThemeColors(build.build_archetype_key);

  const getStatValue = (key: string) => {
    return Number(build[key as keyof typeof build]) || 0;
  };

  const getStatPercentage = (key: string) => {
    return (getStatValue(key) / 4) * 100;
  };

  const handleShare = async () => {
    const shareData = {
      title: "My Controllables Build",
      text: `My Build: ${archetypeInfo.label}\n\n🦉 Awareness: ${getStatValue("awareness").toFixed(1)}\n🐢 Perspective: ${getStatValue("perspective").toFixed(1)}\n🦈 Habit: ${getStatValue("habit").toFixed(1)}\n🛰️ Wellness: ${getStatValue("wellness").toFixed(1)}\n🚀 Environment: ${getStatValue("environment").toFixed(1)}\n\nOverall: ${Number(build.overall).toFixed(1)}/4\n\n#TheControllables`,
      url: window.location.origin,
    };

    if (navigator.share && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          copyToClipboard(shareData.text);
        }
      }
    } else {
      copyToClipboard(shareData.text);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Share your build anywhere!",
    });
  };

  const handleDownload = async () => {
    try {
      const html2canvas = (await import("html2canvas")).default;
      if (!cardRef.current) return;

      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
      });

      const link = document.createElement("a");
      link.download = "my-controllables-build.png";
      link.href = canvas.toDataURL("image/png");
      link.click();

      toast({
        title: "Build card saved",
        description: "Image downloaded successfully!",
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download failed",
        description: "Could not generate image. Try sharing instead.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* The shareable card */}
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative p-6 rounded-2xl bg-gradient-to-br from-card via-card to-muted/50 border-2 border-primary/20 shadow-lg overflow-hidden"
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-primary/5 to-transparent rounded-full blur-xl" />

        {/* Header */}
        <div className="relative text-center mb-6">
          <h2 className="font-display text-xl font-bold text-foreground mb-1">
            My Build
          </h2>
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${themeColors.bg} border ${themeColors.border}`}>
            <span className="text-base">{archetypeInfo.emoji}</span>
            <span className={`text-sm font-medium ${themeColors.text}`}>
              {archetypeInfo.label}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="relative space-y-3 mb-6">
          {STATS.map((stat, index) => {
            const value = getStatValue(stat.key);
            const percentage = getStatPercentage(stat.key);
            return (
              <motion.div
                key={stat.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3"
              >
                <span className="text-lg w-7">{stat.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {stat.label}
                    </span>
                    <span className="text-xs font-bold text-foreground">
                      {value.toFixed(1)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                      className={`h-full rounded-full bg-gradient-to-r ${stat.color}`}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Overall Score */}
        <div className="relative flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/10">
          <span className="text-sm font-medium text-muted-foreground">Overall Build</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-display font-bold text-primary">
              {Number(build.overall).toFixed(1)}
            </span>
            <span className="text-sm text-muted-foreground">/4</span>
          </div>
        </div>

        {/* Branding */}
        <div className="relative mt-4 text-center">
          <p className="text-xs text-muted-foreground">
            thecontrollables.lovable.app
          </p>
        </div>
      </motion.div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleShare}
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleDownload}
        >
          <Download className="w-4 h-4 mr-2" />
          Save Image
        </Button>
      </div>
    </div>
  );
}