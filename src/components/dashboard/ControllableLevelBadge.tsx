import { useControllableLevels } from "@/hooks/useControllableLevels";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getControllableChargeStageState, getControllableRosterProfile } from "@/lib/controllableRoster";
import { getControllableTheme } from "@/lib/controllableTheme";
import type { ControllableType } from "@/components/ControllableCard";

export function ControllableLevelBadge({ controllable, className = "" }: { controllable: ControllableType; className?: string }) {
  const { data: userId } = useQuery({
    queryKey: ["current-user-id"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user?.id ?? null;
    },
    staleTime: Infinity,
  });

  const { data: levels } = useControllableLevels(userId ?? null);
  const levelData = levels?.find((level) => level.type === controllable);

  if (!levelData) return null;

  const chargeStage = getControllableChargeStageState(levelData);
  const theme = getControllableTheme(controllable);
  const profile = getControllableRosterProfile(controllable);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${theme.bgClass} ${theme.textClass} ${className}`}
      title={`${profile.name} Charge Stage`}
    >
      <span>{chargeStage.chargeStageLabel}</span>
    </span>
  );
}
