import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
const mocks = vi.hoisted(() => ({ insert: vi.fn(), getSession: vi.fn(), onAuthStateChange: vi.fn(), capture: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({ insert: mocks.insert }), auth: { getSession: mocks.getSession, onAuthStateChange: mocks.onAuthStateChange } } }));
vi.mock('@/hooks/useAnalytics', () => ({ capturePosthogEvent: mocks.capture }));
function storage() { const map = new Map<string, string>(); return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => map.set(k, v), removeItem: (k: string) => map.delete(k) }; }
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks();
  const local = storage(), session = storage();
  vi.stubGlobal('localStorage', local); vi.stubGlobal('sessionStorage', session);
  vi.stubGlobal('window', { localStorage: local, sessionStorage: session, location: { pathname: '/', search: '?utm_source=JB%20Launch!&ref=Friend', hostname: 'example.com' }, innerWidth: 400, innerHeight: 800 });
  vi.stubGlobal('document', { referrer: 'https://search.example/path?private=secret' });
  mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'session-user' } } } });
  mocks.insert.mockResolvedValue({ error: null });
});
describe('growth measurement', () => {
  it('sanitizes attribution, captures only hostname, and preserves first touch', async () => {
    const lib = await import('@/lib/growthAttribution'); lib.captureAttribution();
    expect(lib.getAttribution().first).toMatchObject({ utm_source: 'jblaunch', referrer_host: 'search.example', landing_path: '/' });
    window.location.search = '?utm_source=second'; lib.captureAttribution();
    expect(lib.getAttribution().first?.utm_source).toBe('jblaunch'); expect(lib.getAttribution().last?.utm_source).toBe('second');
    expect(lib.sanitizeAttributionValue('A'.repeat(100))).toHaveLength(64);
  });
  it('ignores own and preview referrers and survives blocked storage', async () => {
    const lib = await import('@/lib/growthAttribution');
    for (const host of ['example.com', 'preview--demo.lovable.app', 'localhost']) {
      localStorage.removeItem('growth_first_touch'); document.referrer = `https://${host}/private`;
      lib.captureAttribution(); expect(lib.getAttribution().first?.referrer_host).toBeUndefined();
    }
    vi.stubGlobal('window', undefined); expect(() => lib.captureAttribution()).not.toThrow(); expect(lib.getAttribution().first).toBeNull();
  });
  it('drops unknown names, keys, URLs, emails, data values and invalid types', async () => {
    const lib = await import('@/lib/growthEvents');
    lib.trackGrowthEvent('unknown'); expect(mocks.insert).not.toHaveBeenCalled();
    expect(lib.sanitizeGrowthProps({ email: 'private', placement: 'HTTPS://host', step: 'x@y', method: 'DATA:secret', surface: {}, track: 'read_along', reading_status: null })).toEqual({ track: 'read_along', reading_status: null });
  });
  it('inserts without a select method, trusts only session identity and throttles landing', async () => {
    const lib = await import('@/lib/growthEvents'); lib.trackGrowthEvent('landing_view', { user_id: 'spoof', placement: 'hero' }); lib.trackGrowthEvent('landing_view');
    await vi.waitFor(() => expect(mocks.insert).toHaveBeenCalledTimes(1));
    expect(mocks.insert.mock.calls[0][0]).toMatchObject({ event_type: 'growth', user_id: 'session-user', event_data: { placement: 'hero' } });
    expect(mocks.insert.mock.calls[0][0].event_data.user_id).toBeUndefined();
  });
  it('buffers errors, caps retained events at 50, retries once on sign in and drops failures', async () => {
    const old = Array.from({ length: 55 }, () => ({ at: Date.now(), payload: { event_type: 'growth', event_name: 'share_clicked', event_data: {}, page_path: '/', session_id: 's', screen_size: '1x1' } }));
    localStorage.setItem('growth_event_buffer', JSON.stringify(old));
    mocks.insert.mockResolvedValue({ error: { message: 'RLS' } });
    const lib = await import('@/lib/growthEvents'); lib.trackGrowthEvent('share_clicked');
    await vi.waitFor(() => expect(JSON.parse(localStorage.getItem('growth_event_buffer')!)).toHaveLength(50));
    await vi.waitFor(() => expect(mocks.insert).toHaveBeenCalledTimes(1));
    mocks.onAuthStateChange.mock.calls[0][0]('SIGNED_IN');
    await vi.waitFor(() => expect(JSON.parse(localStorage.getItem('growth_event_buffer')!)).toHaveLength(0));
    await vi.waitFor(() => expect(mocks.insert).toHaveBeenCalledTimes(51));
  });
  it('limits a session to 30 events and excludes expired buffered events', async () => {
    localStorage.setItem('growth_event_buffer', JSON.stringify([{ at: Date.now() - 8 * 86400000, payload: { event_type: 'growth' } }]));
    mocks.insert.mockResolvedValue({ error: { message: 'RLS' } });
    const lib = await import('@/lib/growthEvents');
    for (let i = 0; i < 35; i++) lib.trackGrowthEvent('share_clicked');
    await vi.waitFor(() => expect(mocks.insert).toHaveBeenCalledTimes(30));
    await vi.waitFor(() => expect(JSON.parse(localStorage.getItem('growth_event_buffer')!)).toHaveLength(30));
  });
  it('keeps display_name with all signup attribution metadata', async () => {
    const { captureAttribution, getSignupAttribution } = await import('@/lib/growthAttribution'); captureAttribution();
    expect(getSignupAttribution()).toEqual({ signup_source: 'jblaunch', signup_medium: null, signup_campaign: null, signup_ref: 'friend', signup_landing_path: '/' });
    expect(readFileSync('src/pages/Auth.tsx', 'utf8')).toContain('data: { display_name: displayName.trim() || null, ...getSignupAttribution(), ...signupMetadata }');
  });
});

it('drops sleep, mood, emotion and feeling properties from growth events', async () => {
  const { sanitizeGrowthProps } = await import('@/lib/growthEvents');
  expect(sanitizeGrowthProps({sleep: 4, mood: 'heavy', emotion: 'anxious', feeling: 'okay', sleep_hours: 7.5, note: 'private'})).toEqual({});
});
