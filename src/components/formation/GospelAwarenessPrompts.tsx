import { ProjectFeedbackLink } from "@/components/ProjectFeedback";
import { JB_STUDY_NOTE } from "@/lib/projectFeedback";
import { gospelReadingUrl } from "@/domain/formation/gospelAwareness";
import type { GospelAwarenessReading } from '@/domain/formation/gospelAwareness';

export function GospelAwarenessPrompts({ reading, draft = false }: { reading: GospelAwarenessReading; draft?: boolean }) {
  return (
    <section aria-label="Gospel-first Awareness" className="space-y-3 rounded-2xl border border-primary/15 bg-primary/5 p-4" data-testid="gospel-awareness-prompts">
      <div>
        <p className="font-semibold text-foreground">Awareness 🦉 · Notice Jesus first</p>
        <a href={gospelReadingUrl(reading.scriptureReference)} target="_blank" rel="noopener noreferrer" aria-label={`Read ${reading.scriptureReference} in the NLT on Bible.com (opens in a new tab)`} className="mt-1 inline-block rounded text-sm font-medium text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{reading.scriptureReference} (NLT)</a>
        <a href={`/scripture?reference=${encodeURIComponent(reading.scriptureReference)}`} className="ml-3 inline-flex min-h-11 items-center rounded text-sm text-primary underline focus-visible:ring-2 focus-visible:ring-ring">Open Bible companion</a>
        {draft ? <p className="mt-1 text-xs text-muted-foreground">Draft guidance · pending independent theological review</p> : null}
      </div>
      <ol className="space-y-3 text-sm leading-6">
        {(['observe', 'understand', 'respond'] as const).map((key) => (
          <li key={key}><span className="font-semibold capitalize text-foreground">{key[0].toUpperCase() + key.slice(1)}:</span>{' '}{reading[key]}</li>
        ))}
      </ol>
      <p className="text-xs leading-5 text-muted-foreground">Formation guidance, not a Scripture quotation. Read the passage in context. Reflect privately; record your response in One honest truth.</p>
      <div className="space-y-2 border-t border-primary/15 pt-3">
        <p className="text-xs leading-5 text-muted-foreground">{JB_STUDY_NOTE} — JB</p>
        <ProjectFeedbackLink />
        <p className="text-xs leading-5 text-muted-foreground">GitHub feedback is public. Leave out private reflections and personal details.</p>
      </div>
    </section>
  );
}
