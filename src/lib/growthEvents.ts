import { supabase } from '@/integrations/supabase/client';
import { capturePosthogEvent } from '@/hooks/useAnalytics';
import { getAttribution } from './growthAttribution';
import { APP_VERSION } from './version';
export const GROWTH_EVENTS_ENABLED = true;
export const GROWTH_EVENT_NAMES = ['landing_view', 'quick_start_step_viewed', 'signup_form_viewed', 'signup_submitted', 'signup_failed', 'first_circuit_completed', 'book_link_click', 'book_nudge_viewed', 'book_nudge_dismissed', 'share_clicked', 'share_completed'] as const;
type Value = string | number | boolean | null;
const PROP_KEYS = new Set(['placement', 'step', 'reason_category', 'method', 'surface', 'track', 'reading_status']);
const ATTR_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'ref', 'referrer_host'] as const;
export function sanitizeGrowthProps(props: Record<string, unknown> = {}): Record<string, Value> {
  const result: Record<string, Value> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!PROP_KEYS.has(key)) continue;
    if (value === null || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) result[key] = value as Value;
    if (typeof value === 'string' && value.length <= 80 && !/https?:\/\/|data:|@/i.test(value)) result[key] = value;
  }
  return result;
}
type Payload = { event_type: string; event_name: string; event_data: Record<string, Value>; page_path: string; session_id: string; screen_size: string; user_id?: string };
type Buffered = { at: number; payload: Payload };
let count = 0, landing = false, listening = false;
let memorySession: string | undefined;
const BUFFER_KEY = 'growth_event_buffer';
function buffer(): Buffered[] {
  try { const data = JSON.parse(localStorage.getItem(BUFFER_KEY) || '[]'); return Array.isArray(data) ? data.filter(e => e?.at > Date.now() - 7 * 86400000 && e?.payload?.event_type === 'growth').slice(-50) : []; } catch { return []; }
}
function save(events: Buffered[]) { try { localStorage.setItem(BUFFER_KEY, JSON.stringify(events.slice(-50))); } catch { /* Best effort */ } }
async function send(payload: Payload) {
  const { data } = await supabase.auth.getSession();
  const anonymous = { ...payload };
  delete anonymous.user_id;
  const result = await supabase.from('app_events').insert({ ...anonymous, ...(data.session?.user.id ? { user_id: data.session.user.id } : {}) });
  if (result.error) throw result.error;
}
function listen() {
  if (listening) return;
  listening = true;
  supabase.auth.onAuthStateChange((event) => {
    if (event !== 'SIGNED_IN') return;
    // Defer Supabase calls outside the synchronous auth callback lock.
    setTimeout(() => { const pending = buffer(); save([]); void Promise.allSettled(pending.map(e => send(e.payload))); }, 0);
  });
}
export function trackGrowthEvent(name: string, props?: Record<string, unknown>): void {
  if (!GROWTH_EVENTS_ENABLED || typeof window === 'undefined') return;
  if (!(GROWTH_EVENT_NAMES as readonly string[]).includes(name)) { if (import.meta.env.DEV) console.warn('Unknown growth event'); return; }
  try {
    let session = memorySession ??= crypto.randomUUID();
    try {
      session = sessionStorage.getItem('app_session_id') || session;
      sessionStorage.setItem('app_session_id', session);
      count = Math.max(count, Number(sessionStorage.getItem('growth_event_count')) || 0);
      landing = landing || sessionStorage.getItem('growth_landing_view') === 'true';
    } catch { /* Use memory throttle when storage is blocked */ }
    if (count >= 30 || (name === 'landing_view' && landing)) return;
    count++;
    if (name === 'landing_view') landing = true;
    try {
      sessionStorage.setItem('growth_event_count', String(count));
      if (landing) sessionStorage.setItem('growth_landing_view', 'true');
    } catch { /* Use memory throttle */ }
    const data = sanitizeGrowthProps(props);
    const first = getAttribution().first;
    for (const key of ATTR_KEYS) if (first?.[key]) data[key] = first[key];
    data.app_version = APP_VERSION;
    const payload: Payload = { event_type: 'growth', event_name: name, event_data: data, page_path: window.location.pathname, session_id: session, screen_size: `${window.innerWidth}x${window.innerHeight}` };
    listen();
    capturePosthogEvent(name, data);
    void send(payload).catch(() => save([...buffer(), { at: Date.now(), payload }]));
  } catch { /* Analytics never blocks UI or navigation */ }
}
export function trackFirstCircuitCompleted(userId: string | undefined, track: string) {
  if (!userId) return;
  try { const key = `growth_first_circuit_${userId}`; if (localStorage.getItem(key)) return; localStorage.setItem(key, 'true'); trackGrowthEvent('first_circuit_completed', { track }); } catch { /* Skip dedupe-sensitive event if storage is unavailable */ }
}
export function signupFailureCategory(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  const message = error instanceof Error ? error.message : error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
  if (/already|exists|registered/i.test(code + message)) return 'exists';
  if (/weak|password/i.test(code + message)) return 'weak_password';
  if (/network|fetch|timeout/i.test(code + message)) return 'network';
  return 'other';
}
