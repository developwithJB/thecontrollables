import { Heart, Sprout, CalendarDays, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const domains = [
  {
    path: "/wellness",
    label: "Wellness",
    icon: Heart,
    description: "Body & energy",
    color: "var(--wellness)",
    softColor: "var(--wellness-soft)",
  },
  {
    path: "/growth",
    label: "Growth",
    icon: Sprout,
    description: "Rings & identity",
    color: "var(--perspective)",
    softColor: "var(--perspective-soft)",
  },
  {
    path: "/planner",
    label: "Planner",
    icon: CalendarDays,
    description: "Day & week",
    color: "var(--habit)",
    softColor: "var(--habit-soft)",
  },
  {
    path: "/wealth",
    label: "Wealth",
    icon: Wallet,
    description: "Money rhythm",
    color: "var(--awareness)",
    softColor: "var(--awareness-soft)",
  },
];

export const DomainSummaryCards = () => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {domains.map((domain, i) => (
        <motion.button
          key={domain.path}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.05 }}
          onClick={() => navigate(domain.path)}
          className="flex flex-col items-start gap-1.5 p-3 rounded-xl border border-border/60 bg-card hover:bg-muted/50 transition-colors text-left group"
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `hsl(${domain.softColor})` }}
          >
            <domain.icon
              className="w-4 h-4"
              style={{ color: `hsl(${domain.color})` }}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
              {domain.label}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {domain.description}
            </p>
          </div>
        </motion.button>
      ))}
    </div>
  );
};
