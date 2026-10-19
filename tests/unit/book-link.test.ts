// @vitest-environment jsdom
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const mocks = vi.hoisted(() => ({ trackEvent: vi.fn(), optionalEvent: vi.fn() }));
vi.mock('@/hooks/useAnalytics', () => ({ useAnalytics: () => ({ trackEvent: mocks.optionalEvent }), usePageViewTracking: () => undefined }));
vi.mock('@/lib/growthEvents', () => ({ trackGrowthEvent: mocks.trackEvent }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: () => Promise.resolve({ data: { session: null } }) } } }));
vi.mock('@/lib/featureFlags', () => ({ onboardingQuickStartEnabled: () => true }));
import { BookLink } from '@/components/BookLink';
import Landing from '@/pages/Landing';
import QuickStart from '@/pages/QuickStart';
const page = (component: typeof Landing) => render(createElement(MemoryRouter, null, createElement(component)));
beforeEach(() => {
  const storage = () => {
    const values = new Map<string, string>();
    return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key), clear: () => values.clear() };
  };
  vi.stubGlobal('localStorage', storage()); vi.stubGlobal('sessionStorage', storage()); mocks.trackEvent.mockReset();
});
afterEach(cleanup);
describe('shared book links', () => {
  it('renders only the canonical destination and tracks without preventing navigation', () => {
    render(createElement(BookLink, { placement: 'landing_nav', children: 'Get the book' }));
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('https://a.co/d/1DGPGEV');
    expect(link.getAttribute('target')).toBe('_blank'); expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(fireEvent.click(link)).toBe(true);
    expect(mocks.trackEvent).toHaveBeenCalledWith('book_link_click', { placement: 'landing_nav' });
    expect(mocks.trackEvent).toHaveBeenCalledTimes(1);
    expect(mocks.optionalEvent).not.toHaveBeenCalled();
  });
  it('keeps navigation usable when analytics throws or rejects', async () => {
    render(createElement(BookLink, { placement: 'quick_start', children: 'Book' }));
    mocks.trackEvent.mockImplementationOnce(() => { throw new Error('blocked'); }).mockRejectedValueOnce(new Error('offline'));
    expect(fireEvent.click(screen.getByRole('link'))).toBe(true);
    expect(fireEvent.click(screen.getByRole('link'))).toBe(true);
    await Promise.resolve();
  });
  it('renders all three landing placements and keeps covenant first in the hero', async () => {
    page(Landing);
    for (const [id, placement] of [['landing-book-nav', 'landing_nav'], ['landing-book-hero', 'landing_hero'], ['landing-book-section', 'landing_book_section']]) {
      const link = await screen.findByTestId(id); fireEvent.click(link);
      expect(mocks.trackEvent).toHaveBeenCalledWith('book_link_click', { placement });
    }
    const hero = screen.getByTestId('landing-hero');
    expect(within(hero).getAllByRole('link')[0]).toBe(screen.getByTestId('cta-get-started'));
    expect(screen.getByTestId('cta-get-started').textContent).toContain('Begin my covenant');
  });
  it('shows the QuickStart book link only for not_started', () => {
    page(QuickStart); expect(screen.queryByTestId('quick-start-book-link')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Haven.t started yet/ }));
    expect(screen.getByTestId('quick-start-book-link')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Reading now/ }));
    expect(screen.queryByTestId('quick-start-book-link')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Finished/ }));
    expect(screen.queryByTestId('quick-start-book-link')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Rereading/ }));
    expect(screen.queryByTestId('quick-start-book-link')).toBeNull();
  });
});
