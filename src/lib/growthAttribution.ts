const KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'ref', 'referrer_host'] as const;
export type Attribution = Partial<Record<typeof KEYS[number], string>> & { landing_path: string; captured_at: number };
export const sanitizeAttributionValue = (value: unknown): string | undefined => typeof value === 'string' ? value.toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 64) || undefined : undefined;
function read(storage: Storage, key: string): Attribution | null {
  try {
    const input = JSON.parse(storage.getItem(key) || 'null');
    if (!input || typeof input !== 'object') return null;
    const safe: Attribution = { landing_path: typeof input.landing_path === 'string' ? input.landing_path.split(/[?#]/)[0] : '/', captured_at: Number(input.captured_at) || 0 };
    for (const key of KEYS) { const value = sanitizeAttributionValue(input[key]); if (value) safe[key] = value; }
    return safe;
  } catch { return null; }
}
export function getAttribution(): { first: Attribution | null; last: Attribution | null } {
  if (typeof window === 'undefined') return { first: null, last: null };
  let first = null, last = null;
  try { first = read(window.localStorage, 'growth_first_touch'); } catch { /* Storage unavailable */ }
  try { last = read(window.sessionStorage, 'growth_last_touch'); } catch { /* Storage unavailable */ }
  return { first, last };
}
export function captureAttribution(): void {
  if (typeof window === 'undefined') return;
  try {
    const touch: Attribution = { landing_path: window.location.pathname, captured_at: Date.now() };
    const params = new URLSearchParams(window.location.search);
    for (const key of KEYS) { if (key === 'referrer_host') continue; const value = sanitizeAttributionValue(params.get(key)); if (value) touch[key] = value; }
    try {
      const host = new URL(document.referrer).hostname.toLowerCase();
      if (host !== window.location.hostname && host !== 'localhost' && host !== '127.0.0.1' && !host.endsWith('.localhost') && !host.endsWith('.lovable.app') && !host.endsWith('.lovableproject.com') && host !== 'lovable.dev' && !host.endsWith('.lovable.dev')) touch.referrer_host = sanitizeAttributionValue(host);
    } catch { /* Empty or malformed referrer */ }
    try { if (!window.localStorage.getItem('growth_first_touch')) window.localStorage.setItem('growth_first_touch', JSON.stringify(touch)); } catch { /* Storage unavailable */ }
    try { window.sessionStorage.setItem('growth_last_touch', JSON.stringify(touch)); } catch { /* Storage unavailable */ }
  } catch { /* Attribution must never block startup */ }
}
export function getSignupAttribution() {
  const first = getAttribution().first;
  return { signup_source: first?.utm_source || first?.referrer_host || 'direct', signup_medium: first?.utm_medium || null, signup_campaign: first?.utm_campaign || null, signup_ref: first?.ref || null, signup_landing_path: first?.landing_path || '/' };
}
