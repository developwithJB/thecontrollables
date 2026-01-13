import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { COVENANT_TEXT, COVENANT_CHECKBOX_TEXT } from "@/lib/resetContent";

interface CovenantScreenProps {
  onAccept: () => void;
  isAccepting: boolean;
}

export const CovenantScreen = ({ onAccept, isAccepting }: CovenantScreenProps) => {
  const [accepted, setAccepted] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
    >
      <div className="max-w-sm w-full">
        {/* Covenant Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-10"
        >
          <p className="text-foreground text-lg leading-relaxed whitespace-pre-line">
            {COVENANT_TEXT}
          </p>
        </motion.div>

        {/* Checkbox */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex items-start gap-3 mb-10"
        >
          <Checkbox
            id="covenant"
            checked={accepted}
            onCheckedChange={(checked) => setAccepted(checked === true)}
            className="mt-1"
          />
          <label
            htmlFor="covenant"
            className="text-foreground text-base leading-relaxed cursor-pointer select-none"
          >
            {COVENANT_CHECKBOX_TEXT}
          </label>
        </motion.div>

        {/* Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Button
            onClick={onAccept}
            disabled={!accepted || isAccepting}
            className="w-full h-14 text-lg font-medium"
            size="lg"
          >
            {isAccepting ? "Beginning..." : "Begin My 7 Days"}
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
};
