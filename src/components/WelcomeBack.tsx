import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MISSED_DAY_MESSAGE } from "@/lib/resetContent";

interface WelcomeBackProps {
  onContinue: () => void;
}

export const WelcomeBack = ({ onContinue }: WelcomeBackProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex flex-col items-center justify-center px-6"
    >
      <div className="max-w-sm text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-5xl mb-6"
        >
          🌱
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-foreground text-lg leading-relaxed mb-8"
        >
          {MISSED_DAY_MESSAGE}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            onClick={onContinue}
            className="w-full h-14 text-lg font-medium"
            size="lg"
          >
            Continue
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
};
