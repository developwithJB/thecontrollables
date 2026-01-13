import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DailyReading {
  id: string;
  day_number: number;
  controllable: string;
  emoji: string;
  framing_line: string;
  prompt: string;
  completion_button_text: string;
  control_line: string;
  surrender_line: string;
  quest_action: string;
  integrity_rep: string;
  reflection: string;
  reading_source: string;
  reading_chapter: string;
  reading_text: string;
  created_at: string;
  updated_at: string;
}

export const useDailyReadings = () => {
  const { data: readings = [], isLoading, error } = useQuery({
    queryKey: ["daily-readings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_readings")
        .select("*")
        .order("day_number", { ascending: true });

      if (error) throw error;
      return data as DailyReading[];
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const getDayContent = (dayNumber: number): DailyReading | null => {
    return readings.find((r) => r.day_number === dayNumber) || null;
  };

  return {
    readings,
    isLoading,
    error,
    getDayContent,
  };
};
