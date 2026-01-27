import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { CalendarReminderButton } from "@/components/CalendarReminderButton";
import { supabase } from "@/integrations/supabase/client";

interface ResetCompleteProps {
  isFullReset?: boolean;
  /** Current day number in the snapshot (1-7) */
  dayNumber?: number;
}

export const ResetComplete = ({ isFullReset = false, dayNumber = 1 }: ResetCompleteProps) => {
  const navigate = useNavigate();
  const [timezone, setTimezone] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [showCalendarReminder, setShowCalendarReminder] = useState(false);

  // Check if this is Day 1 completion and user hasn't dismissed the reminder before
  useEffect(() => {
    if (dayNumber === 1 && !isFullReset) {
      // Check localStorage to see if user has seen this before
      const hasSeenCalendarPrompt = localStorage.getItem("calendar_reminder_shown");
      if (!hasSeenCalendarPrompt) {
        setShowCalendarReminder(true);
        localStorage.setItem("calendar_reminder_shown", "true");
      }
    }
  }, [dayNumber, isFullReset]);

  // Fetch user's timezone from profile
  useEffect(() => {
    const fetchTimezone = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("timezone")
          .eq("id", user.id)
          .single();
        if (data?.timezone) {
          setTimezone(data.timezone);
        }
      }
    };
    fetchTimezone();
  }, []);

  useEffect(() => {
    // Longer timeout when showing calendar reminder
    const timeout = showCalendarReminder ? 8000 : 4000;
    const timer = setTimeout(() => {
      navigate("/dashboard");
    }, timeout);

    return () => clearTimeout(timer);
  }, [navigate, showCalendarReminder]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col items-center justify-center px-6"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className="text-6xl mb-6"
      >
        ✨
      </motion.div>

      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-2xl font-semibold text-foreground text-center mb-2"
      >
        {isFullReset ? "You've completed your snapshot." : "You've checked in for today."}
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-muted-foreground text-center"
      >
        {isFullReset ? "Carry this forward." : "See you tomorrow. Consistency beats perfection."}
      </motion.p>

      {/* Calendar reminder prompt - Day 1 only, first time */}
      {showCalendarReminder && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-8 text-center max-w-xs"
        >
          <p className="text-sm text-muted-foreground mb-3">
            Want a gentle reminder tomorrow?
            <br />
            <span className="text-foreground/80">Add it to your calendar instead.</span>
          </p>
          <CalendarReminderButton
            source="post_day_1"
            timezone={timezone}
            showFirstTimeSubtext={true}
          />
        </motion.div>
      )}
    </motion.div>
  );
};
