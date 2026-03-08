import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Moon, Footprints, Apple, TrendingUp, TrendingDown, Minus, Share2, Download, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWeeklyWellnessReport } from "@/hooks/useWeeklyWellnessReport";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";

interface WeeklyWellnessReportProps {
  userId: string | undefined;
}

const TrendIcon = ({ trend }: { trend: "up" | "down" | "steady" }) => {
  if (trend === "up") return <TrendingUp className="w-4 h-4 text-green-500" />;
  if (trend === "down") return <TrendingDown className="w-4 h-4 text-destructive" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
};

const RatingBar = ({ value, max = 5 }: { value: number; max?: number }) => (
  <div className="flex gap-0.5 flex-1">
    {Array.from({ length: max }, (_, i) => (
      <div
        key={i}
        className={cn(
          "h-2 flex-1 rounded-full transition-colors",
          i < Math.round(value) ? "bg-accent" : "bg-muted"
        )}
      />
    ))}
  </div>
);

const MiniBarChart = ({ data }: { data: { date: string; sleep: number; movement: number; nutrition: number }[] }) => (
  <div className="flex items-end gap-1 h-16">
    {data.map((day, i) => {
      const avg = (day.sleep + day.movement + day.nutrition) / 3;
      const height = avg > 0 ? (avg / 5) * 100 : 4;
      return (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className={cn(
              "w-full rounded-t-sm transition-all",
              avg > 0 ? "bg-accent" : "bg-muted"
            )}
            style={{ height: `${height}%`, minHeight: avg > 0 ? 4 : 2 }}
          />
          <span className="text-[9px] text-muted-foreground leading-none">{day.date}</span>
        </div>
      );
    })}
  </div>
);

export function WeeklyWellnessReport({ userId }: WeeklyWellnessReportProps) {
  const { report, isLoading } = useWeeklyWellnessReport(userId);
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    if (!cardRef.current || !report) return;
    setIsSharing(true);

    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );

      if (!blob) throw new Error("Failed to generate image");

      if (navigator.share && navigator.canShare?.({ files: [new File([blob], "wellness-report.png", { type: "image/png" })] })) {
        await navigator.share({
          title: "My Weekly Wellness Report",
          text: `Week of ${report.weekStart} – ${report.weekEnd}: Overall ${report.overallAvg}/5`,
          files: [new File([blob], "wellness-report.png", { type: "image/png" })],
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `wellness-report-${report.weekStart}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "Report downloaded!", description: "Share it wherever you'd like." });
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        toast({ title: "Couldn't share", description: "Try again.", variant: "destructive" });
      }
    } finally {
      setIsSharing(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent><Skeleton className="h-32 w-full" /></CardContent>
      </Card>
    );
  }

  if (!report || report.daysLogged === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Calendar className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Log your wellness this week to see your report
          </p>
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    { label: "Sleep", value: report.avgSleep, icon: Moon, color: "text-blue-400" },
    { label: "Movement", value: report.avgMovement, icon: Footprints, color: "text-green-400" },
    { label: "Nutrition", value: report.avgNutrition, icon: Apple, color: "text-orange-400" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card ref={cardRef} className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                🔋 Weekly Wellness
                <TrendIcon trend={report.trend} />
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {report.weekStart} – {report.weekEnd} · {report.daysLogged}/7 days logged
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              disabled={isSharing}
              className="h-8 w-8"
            >
              {isSharing ? (
                <Download className="w-4 h-4 animate-pulse" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Overall Score */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
            <div>
              <p className="text-2xl font-display font-bold text-foreground">{report.overallAvg}/5</p>
              <p className="text-xs text-muted-foreground">Overall avg</p>
            </div>
            {report.prevOverallAvg > 0 && (
              <div className="text-right">
                <p className={cn(
                  "text-sm font-medium",
                  report.trend === "up" ? "text-green-500" : report.trend === "down" ? "text-destructive" : "text-muted-foreground"
                )}>
                  {report.trend === "up" ? "+" : ""}{(report.overallAvg - report.prevOverallAvg).toFixed(1)} vs last week
                </p>
                <p className="text-xs text-muted-foreground">prev: {report.prevOverallAvg}/5</p>
              </div>
            )}
          </div>

          {/* Metric Breakdown */}
          <div className="space-y-3">
            {metrics.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex items-center gap-3">
                <Icon className={cn("w-4 h-4 shrink-0", color)} />
                <span className="text-sm w-20 text-foreground">{label}</span>
                <RatingBar value={value} />
                <span className="text-sm font-medium w-8 text-right text-foreground">{value}</span>
              </div>
            ))}
          </div>

          {/* Mini Chart */}
          <div className="pt-2">
            <p className="text-xs text-muted-foreground mb-2">Daily overview</p>
            <MiniBarChart data={report.dailyData} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
