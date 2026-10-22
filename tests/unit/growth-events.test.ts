import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
const mocks = vi.hoisted(() => ({ insert: vi.fn(), getSession: vi.fn(), onAuthStateChange: vi.fn(), capture: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({ insert: mocks.insert }), auth: { getSession: mocks.getSession, onAuthStateChange: mocks.onAuthStateChange } } }));
vi.mock('@/lib/telemetrySink', () => ({ sendTelemetry: async (_kind: string, payload: unknown) => { const result = await mocks.insert(payload); if(result.error) throw Error('telemetry unavailable'); } }));
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
  it('uses the server sink without trusting a client identity and throttles landing', async () => {
    const lib = await import('@/lib/growthEvents'); lib.trackGrowthEvent('landing_view', { user_id: 'spoof', placement: 'hero' }); lib.trackGrowthEvent('landing_view');
    await vi.waitFor(() => expect(mocks.insert).toHaveBeenCalledTimes(1));
    expect(mocks.insert.mock.calls[0][0]).toMatchObject({ event_type: 'growth', event_data: { placement: 'hero' } });
    expect(mocks.insert.mock.calls[0][0].event_data.user_id).toBeUndefined();
    expect(mocks.insert.mock.calls[0][0].user_id).toBeUndefined();
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
    expect(getSignupAttribution()).toEqual({ signup_source: 'jblaunch', signup_medium: null, signup_campaign: null, signup_content: null, signup_ref: 'friend', signup_landing_path: '/', signup_last_source: 'jblaunch', signup_last_medium: null, signup_last_campaign: null, signup_last_content: null });
    expect(readFileSync('src/pages/onboarding/AuthPage.tsx', 'utf8')).toContain('data: { display_name: displayName.trim() || null, ...getSignupAttribution(), ...signupMetadata }');
  });
});

describe('launch funnel event boundaries', () => {
  it('accepts all client growth names at the server while dropping private properties', async () => {
    const { GROWTH_EVENT_NAMES } = await import('@/lib/growthEvents');
    const { sanitizeTelemetry } = await import('../../supabase/functions/_shared/telemetry');
    for (const name of GROWTH_EVENT_NAMES) {
      const event = sanitizeTelemetry({ kind: 'event', payload: { event_type: 'growth', event_name: name, event_data: { placement: 'day7_review', reflection: 'PRIVATE', email: 'PRIVATE' } } }, 'server-owner');
      expect(event.row).toMatchObject({ user_id: 'server-owner', event_name: name, event_data: { placement: 'day7_review' } });
      expect(JSON.stringify(event)).not.toContain('PRIVATE');
    }
  });
  it('records an authenticated visit once per account per browser session', async () => {
    const lib = await import('@/lib/growthEvents');
    lib.trackAuthenticatedVisit('a'); lib.trackAuthenticatedVisit('a'); lib.trackAuthenticatedVisit('b');
    await vi.waitFor(() => expect(mocks.insert).toHaveBeenCalledTimes(2));
    expect(mocks.insert.mock.calls.every(c => c[0].event_name === 'authenticated_visit')).toBe(true);
  });
  it('records only the seventh local calendar day and deduplicates per account', async () => {
    const { getLocalDate } = await import('@/domain/formation/circuitRules');
    const created = new Date(2027, 2, 13, 12);
    const lib = await import('@/lib/growthEvents');
    lib.trackDaySevenReturn('a', created.toISOString(), '2027-03-18', 'read_along');
    lib.trackDaySevenReturn('a', 'invalid', '2027-03-19', 'read_along');
    expect(mocks.insert).not.toHaveBeenCalled();
    const seventh = new Date(created); seventh.setDate(seventh.getDate() + 6);
    lib.trackDaySevenReturn('a', created.toISOString(), getLocalDate(seventh), 'read_along');
    lib.trackDaySevenReturn('a', created.toISOString(), getLocalDate(seventh), 'read_along');
    await vi.waitFor(() => expect(mocks.insert).toHaveBeenCalledTimes(1));
    expect(mocks.insert.mock.calls[0][0]).toMatchObject({ event_name: 'day7_return', event_data: { track: 'read_along' } });
  });
  it('stores sanitized bio defaults before Quick Start without replacing a first touch', async () => {
    const lib = await import('@/lib/growthAttribution');
    lib.captureAttribution({ pathname: '/start', search: 'utm_source=bio&utm_medium=social&utm_campaign=first100' });
    lib.captureAttribution({ pathname: '/quick-start', search: '?path=read_along' });
    expect(lib.getSignupAttribution()).toMatchObject({ signup_source: 'bio', signup_campaign: 'first100', signup_landing_path: '/start' });
  });
});

it('bounds checkout analytics waiting even if the sink never responds', async () => {
  vi.useFakeTimers();
  try {
    mocks.insert.mockImplementationOnce(() => new Promise(() => {}));
    const lib = await import('@/lib/growthEvents');
    lib.trackGrowthEvent('checkout_opened');
    let finished = false;
    const flush = lib.flushGrowthEvents().then(() => { finished = true; });
    await vi.advanceTimersByTimeAsync(299); expect(finished).toBe(false);
    await vi.advanceTimersByTimeAsync(1); await flush; expect(finished).toBe(true);
  } finally { vi.useRealTimers(); }
});

it('retains first touch while attributing the converting campaign across internal reloads', async () => {
  const lib = await import('@/lib/growthAttribution');
  lib.captureAttribution({ pathname: '/', search: '' });
  lib.captureAttribution({ pathname: '/start', search: '?utm_source=youtube&utm_campaign=first100&utm_content=episode01' });
  document.referrer = 'https://example.com/quick-start';
  lib.captureAttribution({ pathname: '/auth', search: '?mode=signup' });
  expect(lib.getSignupAttribution()).toMatchObject({ signup_source: 'search.example', signup_last_source: 'youtube', signup_last_campaign: 'first100', signup_last_content: 'episode01' });
});
