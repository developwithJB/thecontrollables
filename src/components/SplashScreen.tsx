import { motion } from "framer-motion";

export function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-primary dark:bg-[hsl(222,47%,8%)]"
    >
      {/* Animated Logo */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-24 h-24"
      >
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Sun rays with staggered animation */}
          <g 
            className="stroke-accent"
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
          
          {/* Center circle */}
          <motion.circle
            cx="20"
            cy="20"
            r="10"
            className="stroke-accent fill-none"
            strokeWidth="2"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
          />
          
          {/* D letter */}
          <motion.path
            d="M15.5 13h4c3.8 0 6.5 2.8 6.5 7s-2.7 7-6.5 7h-4V13z M18 15.5v9h1.5c2.5 0 4-1.8 4-4.5s-1.5-4.5-4-4.5H18z"
            className="fill-accent"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.3 }}
          />
        </svg>
      </motion.div>

      {/* App name */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className="mt-6 text-center"
      >
        <h1 className="font-display font-bold text-2xl text-primary-foreground dark:text-foreground">
          The Dashboard
        </h1>
        <p className="text-sm text-primary-foreground/70 dark:text-muted-foreground mt-1">
          by The Controllables
        </p>
      </motion.div>

      {/* Loading indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.3 }}
        className="mt-8"
      >
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-accent"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}