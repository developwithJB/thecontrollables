import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getLocalDate } from '@/domain/formation/circuitRules';
import { CHECKIN_MOODS, EMPTY_PRIVATE_CHECKIN, loadPrivateCheckin, savePrivateCheckin, deletePrivateCheckin, deleteAllPrivateCheckins, type PrivateCheckin } from '@/data/wellness/privateCheckins';

export function PrivateCheckinCard({ userId }: { userId: string }) {
  const date = getLocalDate();
  // Keying the editor by account and date also discards unsaved text on account switch.
  return <PrivateCheckinEditor key={`${userId}:${date}`} userId={userId} date={date} />;
}
function PrivateCheckinEditor({ userId, date }: { userId: string; date: string }) {
  const client = useQueryClient();
  const queryKey = ['private-wellness-checkin', userId, date];
  const query = useQuery({ queryKey, queryFn: () => loadPrivateCheckin(userId, date), enabled: Boolean(userId), refetchOnWindowFocus: false, gcTime: 0 });
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const [value, setValue] = useState<PrivateCheckin>(EMPTY_PRIVATE_CHECKIN);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { if (!dirty && query.isSuccess) setValue(query.data ?? EMPTY_PRIVATE_CHECKIN); }, [query.data, query.isSuccess, dirty]);
  function update(patch: Partial<PrivateCheckin>) { setValue(v => ({ ...v, ...patch })); setDirty(true); setMessage(''); }
  async function persist(remove: boolean, all = false) {
    setBusy(true); setMessage('');
    try {
      if (all) await deleteAllPrivateCheckins(userId); else if (remove) await deletePrivateCheckin(userId, date); else await savePrivateCheckin(userId, date, value);
      if (!active.current) return;
      if (all) client.setQueriesData({ queryKey: ['private-wellness-checkin', userId] }, null);
      const saved = remove ? null : { ...value };
      client.setQueryData(queryKey, saved); setValue(saved ?? EMPTY_PRIVATE_CHECKIN); setDirty(false);
      setMessage(all ? 'All private check-ins deleted.' : remove ? 'Today’s private check-in deleted.' : 'Private check-in saved.');
    } catch { setMessage('Could not save this change. Your unsaved entries remain here; try again.'); }
    finally { setBusy(false); }
  }
  const disabled = busy || query.isPending || query.isError || !userId;
  return <section className="ph-no-capture ph-block rounded-2xl border bg-card p-4 sm:p-5 space-y-4" data-ph-no-capture data-dd-privacy="hidden" aria-labelledby="private-checkin-title">
    <div><h2 id="private-checkin-title" className="font-display text-lg font-semibold">Private check-in</h2><p className="text-sm text-muted-foreground">Optional, private to your account, and not graded. This never completes a circuit or changes your 75-day record. No check-in data goes to AI or analytics.</p></div>
    {query.isPending ? <p role="status">Loading private check-in…</p> : null}
    {query.isError ? <div role="alert">Private check-in could not be loaded. <Button variant="outline" onClick={() => void query.refetch()}>Try loading again</Button></div> : null}
    <fieldset disabled={disabled} className="space-y-4">
      <legend className="sr-only">Optional private check-in for {date}</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="checkin-sleep">How did you sleep?</Label><select id="checkin-sleep" className="flex h-10 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={value.sleep_rating ?? ''} onChange={e => update({ sleep_rating: e.target.value ? Number(e.target.value) : null })}><option value="">Skip</option>{[1,2,3,4,5].map(n => <option key={n} value={n}>{n}{n===1 ? ' — Poor' : n===5 ? ' — Restful' : ''}</option>)}</select></div>
        <div className="space-y-2"><Label htmlFor="checkin-hours">Hours slept (optional)</Label><Input id="checkin-hours" type="number" min={0} max={24} step={0.25} value={value.sleep_hours ?? ''} onChange={e => update({ sleep_hours: e.target.value === '' ? null : Number(e.target.value) })} /></div>
      </div>
      <div className="space-y-2"><Label htmlFor="checkin-feeling">How are you, honestly?</Label><select id="checkin-feeling" className="flex h-10 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={value.mood ?? ''} onChange={e => update({ mood: e.target.value ? e.target.value as PrivateCheckin['mood'] : null })}><option value="">Skip</option>{CHECKIN_MOODS.map(m => <option key={m} value={m}>{m.replace('_',' ')}</option>)}</select></div>
      <div className="space-y-2"><Label htmlFor="checkin-note">Private note (optional, 280 characters)</Label><Textarea id="checkin-note" maxLength={280} value={value.note ?? ''} onChange={e => update({ note: e.target.value || null })} /></div>
      {value.mood === 'heavy' || value.mood === 'anxious' ? <p className="text-sm text-muted-foreground">You do not have to carry this alone. Consider someone you trust. If you need immediate emotional support in the US, call <a className="text-primary underline" href="tel:988?oai_link_source=model_response_hotline">988</a>. If you are in immediate danger elsewhere, contact local emergency services.</p> : null}
      <div className="flex flex-wrap gap-2"><Button disabled={!dirty || disabled} onClick={() => void persist(false)}>Save private check-in</Button><Button variant="outline" disabled={disabled || !query.data} onClick={() => void persist(true)}>Delete today’s check-in</Button><Button variant="outline" disabled={disabled} onClick={() => { if (window.confirm("Permanently delete all of your private check-ins? Formation history stays unchanged.")) void persist(true, true); }}>Delete all private check-ins</Button></div>
    </fieldset>
    {busy || message ? <p role="status" className="text-sm">{busy ? "Applying private check-in change…" : message}</p> : null}
    <p className="text-xs text-muted-foreground">Saved until you delete it or delete your account. Today’s delete removes only this private check-in, not your formation history. Delete all removes saved check-ins across dates.</p>
  </section>;
}
