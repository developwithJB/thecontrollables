import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { FormationCircuitEntry, TrainingTrack, CircuitType } from "@/domain/formation/circuits";
import type { FullyChargedTodayState } from "@/data/formation/fullyChargedRepository";
import { addLocalCalendarDays } from "@/domain/formation/fullyChargedJourney";
import { weekOneRecords, nextSabbathDate } from "@/domain/formation/firstWeek";
import { CONTROLLABLE_GUIDES } from "@/lib/controllables";
import { AIChat } from "@/components/AIChat";

export function FirstWeekPanel({ history, journey, track, today, nextCircuit, canPractice }: {
  history: FormationCircuitEntry[]; journey: FullyChargedTodayState | null; track: TrainingTrack;
  today: string; nextCircuit: CircuitType | null; canPractice: boolean;
}) {
  const [chatOpen, setChatOpen] = useState(false);
  const [sharePreview, setSharePreview] = useState(false);
  const start = track === "fully_charged_75" ? journey?.startLocalDate : history.map(e => e.localDate).sort()[0] ?? today;
  const records = start ? weekOneRecords(history.filter(e => e.track === track), start) : [];
  const weekAvailable = !!start && today >= addLocalCalendarDays(start, 6);
  const reflections = history.filter(e => start && e.localDate >= start && e.circuit === "environment").sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
  const learning = reflections.find(e => e.draft.fields.weekOneLearning)?.draft.fields.weekOneLearning;
  const intention = reflections.find(e => e.draft.fields.weekOneIntention)?.draft.fields.weekOneIntention;
  const uniqueDays = new Set(records.map(e => e.localDate)).size;
  const nextGuide = nextCircuit ? CONTROLLABLE_GUIDES[nextCircuit] : null;
  return <section className="ph-no-capture space-y-4" aria-label="Your first week" data-sentry-mask>
    {canPractice && nextGuide ? <div className="space-y-3 rounded-2xl border border-primary/30 bg-primary/5 p-5" data-testid="next-practice">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">{records.length ? "Welcome back · Your next step" : "Begin with one calm first move"}</p>
      <h2 className="font-display text-xl font-semibold">{nextGuide.emoji} {nextGuide.name}</h2>
      <p className="text-sm text-muted-foreground">{nextCircuit === "awareness" ? "Faith and spirituality live here. Open Scripture, notice Jesus, and choose one honest response. Private prayer does not need to be written down." : "Your saved practices are here. Continue the next circuit at your own pace."} {track === "fully_charged_75" ? "All five circuits and Close today are required before the deadline." : "One meaningful practice counts; nothing resets if you miss a day."}</p>
      <Button asChild variant="future"><Link to={`/formation/today/${nextCircuit}`}>{records.length ? "Continue" : "Start"} {nextGuide.name}</Link></Button>
      {history.some(e => e.localDate < today && e.circuit === "habit" && e.draft.fields.mainPromise) ? <details><summary className="min-h-11 cursor-pointer py-2 text-sm">Your most recent saved promise</summary><p className="whitespace-pre-wrap text-sm">{[...history].filter(e => e.localDate < today && e.circuit === "habit").sort((a,b) => b.localDate.localeCompare(a.localDate))[0]?.draft.fields.mainPromise}</p></details> : null}
    </div> : null}
    {journey?.rulesVersion === "v2_sabbath" && journey.restWeekday != null ? <div className="rounded-2xl border p-4 text-sm" data-testid="sabbath-preview">
      <h2 className="font-semibold">{journey.isRestDay ? "Your Sabbath is today" : `Your next Sabbath: ${nextSabbathDate(today, journey.restWeekday)}`}</h2>
      <p className="mt-2 text-muted-foreground">{["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][journey.restWeekday]} · locked in {journey.startTimezone}. It counts toward 75 days. Wellness 🛰️ requires nutrition, hydration, and described rest or a gentle walk. Awareness 🦉, Perspective 🐢, Habit 🦈 and Environment 🚀 still apply, followed by Close today.</p>
    </div> : null}
    <details className="rounded-2xl border p-4" data-testid="practice-help"><summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">Need an example or a little help?</summary>
      <p className="mt-2 text-sm text-muted-foreground">Keep the next action small and specific: “Read the assigned passage before opening a feed,” “Complete the call I promised,” or “Set out what I need for tomorrow.” Examples are suggestions, not extra requirements.</p>
      <p className="mt-3 text-sm text-muted-foreground">Optional AI coaching can help you think through an action. It can make mistakes and is not Scripture or pastoral authority. Your chosen messages go to the configured AI service, and the existing coach may use account context. No reflection from this screen is attached. Your path works without AI. Existing availability and plan limits apply.</p>
      <Button variant="futureOutline" className="mt-3" onClick={() => setChatOpen(true)}>Open optional AI coach</Button>
    </details>
    {chatOpen ? <AIChat controllable="awareness" emoji="🦉" title="Awareness · Optional coach" isOpen onClose={() => setChatOpen(false)} /> : null}
    {weekAvailable ? <div className="space-y-3 rounded-2xl border p-5" data-testid="week-one-review">
      <h2 className="font-display text-xl font-semibold">Your first week · A private look back</h2>
      <p className="text-sm">{records.length} recorded circuits across {uniqueDays} practice days, {start}–{addLocalCalendarDays(start!, 6)}.</p>
      <p className="text-sm text-muted-foreground">These are saved practices, not a spiritual score or a claim of strict day closeout. Notice what helped you return. Day 7’s assigned Gospel appears with your reviewed lesson when available.</p>
      {learning ? <p className="whitespace-pre-wrap text-sm"><strong>What I learned:</strong> {learning}</p> : null}
      {intention ? <p className="whitespace-pre-wrap text-sm"><strong>My next intention:</strong> {intention}</p> : null}
      {canPractice ? <Link className="inline-flex min-h-11 items-center text-sm text-primary underline" to="/formation/today/environment">Add a private learning and next-week intention in Environment</Link> : null}
      <Button variant="futureOutline" onClick={() => setSharePreview(value => !value)}>Preview a share-safe week-one note</Button>
      {sharePreview ? <div className="rounded-xl border bg-muted/25 p-4" data-testid="week-one-share-preview"><p className="text-sm">I am practicing the five Controllables with The Dashboard. One honest next step at a time.</p><p className="mt-2 text-xs text-muted-foreground">Optional text to copy yourself. No account identity, reflection, counts, private promise or recipient details are included.</p></div> : null}
    </div> : null}
  </section>;
}
