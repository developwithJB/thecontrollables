import { motion } from "framer-motion";
import { Compass, TrendingUp, Calendar, Target } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DashboardIntelligence } from "@/hooks/useDashboardIntelligence";

interface ForecastCardProps {
  data: DashboardIntelligence | null;
  compact?: boolean;
}

export const ForecastCard = ({ data }: ForecastCardProps) => {
  if (!data) return null;

  const tabs = [
    {
      value: "snapshot",
      label: "Snapshot",
      icon: Target,
      content: data.snapshot_forecast || data.tomorrow_forecast,
      detail: "Based on current 7-day cycle",
    },
    {
      value: "month",
      label: "Month",
      icon: Calendar,
      content: data.month_forecast || "Complete more rings to unlock monthly forecast.",
      detail: "Projected from weekly patterns",
    },
    {
      value: "year",
      label: "Year",
      icon: TrendingUp,
      content: data.year_forecast || "Complete more rings to unlock yearly forecast.",
      detail: "12-month trajectory projection",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/50 bg-card/50 p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Compass className="w-3.5 h-3.5 text-accent/70" />
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
          Forecast
        </h3>
      </div>

      <Tabs defaultValue="snapshot" className="w-full">
        <TabsList className="w-full grid grid-cols-3 h-7 mb-3">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="text-[10px] px-1 py-0.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              <tab.icon className="w-3 h-3 mr-1" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-0">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {tab.content}
            </p>
            <p className="text-[10px] text-muted-foreground/50 mt-2">
              {tab.detail}
            </p>
          </TabsContent>
        ))}
      </Tabs>
    </motion.div>
  );
};
