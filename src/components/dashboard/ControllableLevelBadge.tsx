import { useControllableLevels } from "@/hooks/useControllableLevels";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ControllableType } from "@/components/ControllableCard";

/** Tiny inline badge showing "Lv.X" for a specific controllable. Uses cached query. */
export function ControllableLevelBadge({ controllable, className = "" }: { controllable: ControllableType; className?: string }) {
  // Get current user id from cached auth state
  const { data: userId } = useQuery({
    queryKey: ["current-user-id"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user?.id ?? null;
    },
    staleTime: Infinity,
  });

  const { data: levels } = useControllableLevels(userId ?? null);
  const level = levels?.find((l) => l.type === controllable)?.level;

  if (!level) return null;

  return (
    <span className={`text-[10px] font-semibold text-muted-foreground bg-muted/60 rounded px-1 py-0.5 tabular-nums ${className}`}>
      Lv.{level}
    </span>
  );
}
