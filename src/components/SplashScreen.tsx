import { motion } from "framer-motion";

export function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.14, ease: "easeOut" }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
      role="status"
      aria-label="Loading The Dashboard"
    >
      <div className="future-chrome-grid pointer-events-none absolute inset-0 opacity-100" />
      <span className="sr-only">Loading The Dashboard</span>

      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
        className="future-icon-frame relative h-20 w-20"
      >
        <motion.div
          className="absolute inset-2 rounded-2xl border border-primary/20"
          animate={{ rotate: 360 }}
          transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
        />
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12"
        >
          <g
            className="stroke-primary"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <motion.line
              x1="20" y1="2" x2="20" y2="7"
              initial={{ opacity: 0, pathLength: 0 }}
              animate={{ opacity: 1, pathLength: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            />
            <motion.line
              x1="20" y1="33" x2="20" y2="38"
              initial={{ opacity: 0, pathLength: 0 }}
              animate={{ opacity: 1, pathLength: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            />
            <motion.line
              x1="2" y1="20" x2="7" y2="20"
              initial={{ opacity: 0, pathLength: 0 }}
              animate={{ opacity: 1, pathLength: 1 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            />
            <motion.line
              x1="33" y1="20" x2="38" y2="20"
              initial={{ opacity: 0, pathLength: 0 }}
              animate={{ opacity: 1, pathLength: 1 }}
              transition={{ delay: 0.4, duration: 0.3 }}
            />
            <motion.line
              x1="32.5" y1="7.5" x2="29" y2="11"
              initial={{ opacity: 0, pathLength: 0 }}
              animate={{ opacity: 1, pathLength: 1 }}
              transition={{ delay: 0.15, duration: 0.3 }}
            />
            <motion.line
              x1="7.5" y1="7.5" x2="11" y2="11"
              initial={{ opacity: 0, pathLength: 0 }}
              animate={{ opacity: 1, pathLength: 1 }}
              transition={{ delay: 0.25, duration: 0.3 }}
            />
            <motion.line
              x1="32.5" y1="32.5" x2="29" y2="29"
              initial={{ opacity: 0, pathLength: 0 }}
              animate={{ opacity: 1, pathLength: 1 }}
              transition={{ delay: 0.35, duration: 0.3 }}
            />
            <motion.line
              x1="7.5" y1="32.5" x2="11" y2="29"
              initial={{ opacity: 0, pathLength: 0 }}
              animate={{ opacity: 1, pathLength: 1 }}
              transition={{ delay: 0.45, duration: 0.3 }}
            />
          </g>

          <motion.circle
            cx="20"
            cy="20"
            r="10"
            className="fill-none stroke-primary"
            strokeWidth="2"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
          />

          <motion.path
            d="M15.5 13h4c3.8 0 6.5 2.8 6.5 7s-2.7 7-6.5 7h-4V13z M18 15.5v9h1.5c2.5 0 4-1.8 4-4.5s-1.5-4.5-4-4.5H18z"
            className="fill-primary"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.3 }}
          />
        </svg>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16, duration: 0.24 }}
        className="mt-6 h-1 w-36 overflow-hidden rounded-full bg-primary/10"
      >
        <motion.div
          className="h-full w-16 rounded-full bg-primary"
          animate={{ x: [-70, 150] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </motion.div>
  );
}
