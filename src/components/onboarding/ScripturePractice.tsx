import { useState } from "react";
import { useFormationEntryStatus } from "@/hooks/useFormationEntryStatus";
import { gospelReadingUrl, isGospelReference } from "@/domain/formation/gospelAwareness";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

/** Disposable demonstration. Never saves or records a circuit, nor substitutes draft assignments. */
export function ScripturePractice() {
  const status = useFormationEntryStatus();
  const [response, setResponse] = useState("");
  const [practiced, setPracticed] = useState(false);
  const sample = status.data?.sample;
  const reference = sample && isGospelReference(sample.scriptureReference) ? sample.scriptureReference : "Matthew 4:18-22";
  return <section aria-labelledby="sample-practice-heading" data-testid="scripture-practice" className="ph-no-capture space-y-4 rounded-2xl border border-primary/25 bg-primary/5 p-5" data-sentry-mask>
    <p className="text-xs font-semibold uppercase tracking-wider text-primary">Try it before you join · Sample only</p>
    <h2 id="sample-practice-heading" className="font-display text-xl font-semibold">Awareness 🦉 · Faith and spirituality</h2>
    <p className="text-sm text-muted-foreground">Read Scripture, notice the character of Jesus, and choose a response. Prayer can stay between you and God.</p>
    <a className="inline-flex min-h-11 items-center rounded text-primary underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring" href={gospelReadingUrl(reference)} target="_blank" rel="noopener noreferrer">Read {reference} in the NLT on Bible.com (new tab)</a>
    {sample ? <details><summary className="cursor-pointer py-2 text-sm font-semibold">Reviewed Day 1 example</summary><p className="whitespace-pre-wrap text-sm leading-6">{sample.body}</p></details> : <p className="text-xs text-muted-foreground">This is a Scripture-reading demonstration, not an assigned or approved 75-day lesson.</p>}
    <ol className="space-y-2 text-sm"><li><strong>Observe:</strong> What do you notice in the passage?</li><li><strong>Understand:</strong> What do you learn about Jesus?</li><li><strong>Respond:</strong> What is one action you could take?</li></ol>
    <div className="space-y-2"><Label htmlFor="sample-response">Try one response (optional)</Label><Textarea id="sample-response" value={response} maxLength={500} onChange={e => { setResponse(e.target.value); setPracticed(false); }} placeholder="One small action I could take…" aria-describedby="sample-privacy" /></div>
    <p id="sample-privacy" className="text-xs text-muted-foreground">This response stays in this temporary screen. It is not saved, sent to AI, or included in analytics. Opening a passage does not complete a circuit.</p>
    <Button variant="futureOutline" onClick={() => setPracticed(true)}>Finish sample practice</Button>
    {practiced ? <p role="status" className="text-sm">That is the rhythm: read, notice, respond. Create an account when you are ready to save real practices.</p> : null}
  </section>;
}
