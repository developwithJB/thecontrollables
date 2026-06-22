import { BatteryCharging, BookOpen, CheckCircle2, Dumbbell, Sun } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { APP_ROUTES } from "@/lib/appRoutes";

const navItems = [
  { path: APP_ROUTES.home, label: "Today", icon: Sun },
  { path: APP_ROUTES.train, label: "Train", icon: Dumbbell },
  { path: APP_ROUTES.reflect, label: "Reflect", icon: BookOpen },
  { path: APP_ROUTES.proof, label: "Proof", icon: CheckCircle2 },
  { path: APP_ROUTES.myControllables, label: "My", icon: BatteryCharging },
];

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-2xl pb-[env(safe-area-inset-bottom)] md:hidden"
      style={{
        background: "linear-gradient(180deg, hsl(var(--background) / 0.72), hsl(var(--background) / 0.94))",
        borderColor: "hsl(var(--primary) / 0.16)",
      }}
    >
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <motion.button
              key={item.path}
              onClick={() => navigate(item.path)}
              whileTap={{ scale: 0.96 }}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-2 transition-colors ${
                isActive ? "bg-primary/10" : "hover:bg-muted/40"
              }`}
            >
              <item.icon
                className={`w-5 h-5 transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <span
                className={`text-[10px] font-medium transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-indicator"
                  className="absolute -top-px left-3 right-3 h-0.5 rounded-full bg-primary shadow-[0_0_14px_hsl(var(--primary)/0.55)]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};

// Desktop sidebar-style navigation rail
export const DesktopNavRail = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="hidden w-16 shrink-0 flex-col gap-1 border-r border-primary/10 bg-background/35 py-4 backdrop-blur-xl md:flex lg:w-48">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`relative mx-2 flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              isActive
                ? "border border-primary/20 bg-primary/10 text-primary shadow-[inset_0_0_24px_hsl(var(--primary)/0.05)]"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span className="hidden lg:inline">{item.label}</span>
            {isActive && (
              <motion.div
                layoutId="nav-rail-indicator"
                className="absolute bottom-2 left-0 top-2 w-0.5 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.55)]"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
};
