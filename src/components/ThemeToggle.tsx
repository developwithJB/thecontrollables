import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import {
  applyStoredThemePreference,
  setThemePreference,
  type ThemePreference,
} from "@/lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemePreference>("dark");
  const isDark = theme === "dark";

  useEffect(() => {
    setTheme(applyStoredThemePreference());
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(setThemePreference(nextTheme));
  };

  return (
    <motion.button
      onClick={toggleTheme}
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      className={`relative w-14 h-7 rounded-full p-0.5 transition-all duration-300 ${
        isDark 
          ? "bg-accent/20 shadow-[0_0_12px_rgba(102,189,239,0.3)]" 
          : "bg-muted"
      }`}
      aria-label="Toggle theme"
    >
      {/* Track glow effect for dark mode */}
      {isDark && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 rounded-full bg-gradient-to-r from-accent/10 to-accent/20"
        />
      )}
      
      {/* Sliding thumb */}
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={`relative w-6 h-6 rounded-full flex items-center justify-center ${
          isDark 
            ? "bg-accent text-accent-foreground ml-auto shadow-[0_0_8px_rgba(102,189,239,0.5)]" 
            : "bg-white text-foreground shadow-sm"
        }`}
      >
        <motion.div
          initial={false}
          animate={{ rotate: isDark ? 360 : 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {isDark ? (
            <Moon className="w-3.5 h-3.5" />
          ) : (
            <Sun className="w-3.5 h-3.5" />
          )}
        </motion.div>
      </motion.div>
    </motion.button>
  );
}
