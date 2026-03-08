import { useControllableLevels } from "@/hooks/useControllableLevels";
import type { ControllableType } from "@/components/ControllableCard";

interface Props {
  userId: string | null | undefined;
  controllable: ControllableType;
  className?: string;
}

/**
 * Tiny inline badge showing "Lv.X" for a specific controllable.
 * Reads from the shared cached query so no extra network calls.
 */
export function ControllableLevelBadge({ userId, controllable, className = "" }: Props) {
  const { data: levels } = useControllableLevels(userId ?? null);
  const level = levels?.find((l) => l.type === controllable)?.level;

  if (!level) return null;

  return (
    <span className={`text-[10px] font-semibold text-muted-foreground bg-muted/60 rounded px-1 py-0.5 tabular-nums ${className}`}>
      Lv.{level}
    </span>
  );
}
