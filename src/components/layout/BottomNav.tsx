import { Sun, CalendarDays, Activity, Sprout, Wallet } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const navItems = [
  { path: "/home", label: "Today", icon: Sun },
  { path: "/planner", label: "Plan", icon: CalendarDays },
  { path: "/wellness", label: "Body", icon: Activity },
  { path: "/growth", label: "Growth", icon: Sprout },
  { path: "/wealth", label: "Money", icon: Wallet },
];

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-xl pb-[env(safe-area-inset-bottom)] md:hidden"
      style={{
        background: "hsl(var(--background) / 0.85)",
        borderColor: "hsl(var(--border) / 0.5)",
      }}
    >
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path === "/wealth" && location.pathname === "/money");
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors"
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
                  className="absolute -top-px left-2 right-2 h-0.5 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
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
    <nav className="hidden md:flex flex-col w-16 lg:w-48 border-r border-border/50 bg-card/50 py-4 gap-1 shrink-0">
      {navItems.map((item) => {
        const isActive =
          location.pathname === item.path ||
          (item.path === "/wealth" && location.pathname === "/money");
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`relative flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors text-sm font-medium ${
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span className="hidden lg:inline">{item.label}</span>
            {isActive && (
              <motion.div
                layoutId="nav-rail-indicator"
                className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-primary"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
};
