import { useFormationPracticeSummary } from "@/hooks/useFormationPracticeSummary";
export function FormationPracticeSummary({ userId, legacyEmpty }: { userId: string; legacyEmpty: boolean }) {
  const summary = useFormationPracticeSummary(userId);
  return <div className="mt-3 text-sm" aria-live="polite">
    <p>Formation practices recorded: {summary.error ? "Unavailable" : summary.isLoading ? "Loading…" : summary.total}</p>
    {!summary.error && !summary.isLoading && summary.total > 0 ? <>
      <p className="text-sm">Practice days: {summary.days} · Days with all five circuits recorded: {summary.completeDays}</p>
      {legacyEmpty ? <p className="text-xs text-muted-foreground">Formation practices are counted separately.</p> : null}
      <p className="text-xs text-muted-foreground">Read Along records practice without adding XP, charge, kept promises, covenant days or streak credit. Those figures come from separate tools.</p>
    </> : null}
  </div>;
}
