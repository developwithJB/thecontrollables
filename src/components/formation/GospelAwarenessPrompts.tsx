import type { GospelAwarenessReading } from '@/domain/formation/gospelAwareness';

export function GospelAwarenessPrompts({ reading, draft = false }: { reading: GospelAwarenessReading; draft?: boolean }) {
  return (
    <section aria-label="Gospel-first Awareness" className="space-y-3 rounded-2xl border border-primary/15 bg-primary/5 p-4" data-testid="gospel-awareness-prompts">
      <div>
        <p className="font-semibold text-foreground">Awareness 🦉 · Notice Jesus first</p>
        <a href={`https://www.biblegateway.com/passage/?search=${encodeURIComponent(reading.scriptureReference)}&version=WEB`} target="_blank" rel="noopener noreferrer" aria-label={`Read ${reading.scriptureReference} on Bible Gateway (opens in a new tab)`} className="mt-1 inline-block rounded text-sm font-medium text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{reading.scriptureReference}</a>
        {draft ? <p className="mt-1 text-xs text-muted-foreground">Draft guidance · pending independent theological review</p> : null}
      </div>
      <ol className="space-y-3 text-sm leading-6">
        {(['observe', 'understand', 'respond'] as const).map((key) => (
          <li key={key}><span className="font-semibold capitalize text-foreground">{key[0].toUpperCase() + key.slice(1)}:</span>{' '}{reading[key]}</li>
        ))}
      </ol>
      <p className="text-xs leading-5 text-muted-foreground">Formation guidance, not a Scripture quotation. Read the passage in context. Reflect privately; record your response in One honest truth.</p>
    </section>
  );
}
