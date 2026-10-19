import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FuturePanel } from '@/components/ui/future';
import { trackGrowthEvent } from '@/lib/growthEvents';
import { getFullyChargedDayGuide } from '@/domain/formation/fullyChargedJourney';
export const REVIEW_DAY_INVITE_URL = 'https://thedashboard.agbcoaching.com/?utm_source=share&utm_medium=app&utm_campaign=review_day_invite';
export function ReviewDayInvite({ dayNumber }: { dayNumber: number | null }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  if (!dayNumber || !getFullyChargedDayGuide(dayNumber)?.reviewDay) return null;
  async function invite() {
    setBusy(true); setMessage('');
    trackGrowthEvent('share_clicked', { surface: 'review_day' });
    try {
      if (navigator.share) {
        await navigator.share({ title: 'The Dashboard', text: 'Join me in a private daily formation practice.', url: REVIEW_DAY_INVITE_URL });
        trackGrowthEvent('share_completed', { method: 'native' }); setMessage('Invitation shared.');
      } else {
        await navigator.clipboard.writeText(REVIEW_DAY_INVITE_URL);
        trackGrowthEvent('share_completed', { method: 'clipboard' }); setMessage('Invite link copied. Share it with someone you trust.');
      }
    } catch (error) { setMessage(error instanceof Error && error.name === 'AbortError' ? 'Sharing cancelled. Nothing was posted.' : 'Could not share the invitation. Try again.'); }
    finally { setBusy(false); }
  }
  return <FuturePanel className="space-y-3 p-4 sm:p-5"><h2 className="font-display text-lg font-semibold">Share this week with someone you trust</h2><p className="text-sm text-muted-foreground">An optional invitation, with no private reflections, scores or comparisons.</p><Button disabled={busy} onClick={() => void invite()}>Invite a friend</Button>{message ? <p role="status" className="text-sm">{message}</p> : null}</FuturePanel>;
}
