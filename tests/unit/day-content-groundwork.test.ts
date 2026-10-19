// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as mapping from '@/domain/formation/bookDayMapping';
import { findDuplicateGuideReadings } from '@/domain/formation/readingAudit';
import { FULLY_CHARGED_75_DAY_GUIDES, validateFullyChargedDayGuides } from '@/domain/formation/fullyChargedJourney';
import { GOSPEL_FRAMING_DRAFT_SEED } from '@/domain/formation/contentSeed';
import { isGospelReference } from '@/domain/formation/gospelAwareness';
import { validateFormationContent } from '@/domain/formation/content';
import { FullyChargedJourneyPanel } from '@/components/formation/FullyChargedJourneyPanel';
import type { FullyChargedTodayState } from '@/data/formation/fullyChargedRepository';
vi.mock('@/lib/growthEvents', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/data/formation/contentRepository', () => ({ loadPublishedFormationContentForDay: vi.fn() }));
vi.mock('@/components/formation/GospelAwarenessPrompts', () => ({ GospelAwarenessPrompts: () => null }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('per-day editorial groundwork', () => {
  it('starts all 75 mappings as empty placeholders and validates filled chapters', () => {
    expect(mapping.validateBookDayMapping()).toEqual([]);
    expect(mapping.BOOK_DAY_MAPPING).toHaveLength(75);
    const worksheet = readFileSync('docs/christian-formation/book-day-mapping.md', 'utf8');
    expect(worksheet.match(/^\| \d+ \|/gm)).toHaveLength(75);
    for (const guide of FULLY_CHARGED_75_DAY_GUIDES) expect(worksheet.split('\n').find(line => line.startsWith(`| ${guide.dayNumber} |`))).toContain(`| ${guide.scriptureReference} |`);
    expect(mapping.BOOK_DAY_MAPPING.every(e => e.status === 'placeholder' && e.chapter === null && e.concept === null && e.controllableFocus === null)).toBe(true);
    expect(mapping.getBookMappingForDay(0)).toBeUndefined();
    expect(mapping.getBookMappingForDay(76)).toBeUndefined();
    expect(mapping.isBookMappingFilled({ ...mapping.BOOK_DAY_MAPPING[0], status: 'jb_filled', chapter: ' ' })).toBe(false);
    expect(mapping.validateBookDayMapping([{ ...mapping.BOOK_DAY_MAPPING[0], status: 'jb_filled' }, ...mapping.BOOK_DAY_MAPPING.slice(1)])).toContain('Filled mappings require a chapter.');
    expect(mapping.validateBookDayMapping([mapping.BOOK_DAY_MAPPING[0], ...mapping.BOOK_DAY_MAPPING.slice(0, 74)])).toContain('Day numbers must be unique.');
  });
  it('records every duplicate and overlapping range without invalidating the guides', () => {
    expect(findDuplicateGuideReadings(FULLY_CHARGED_75_DAY_GUIDES)).toMatchSnapshot();
    expect(validateFullyChargedDayGuides()).toEqual([]);
    expect(findDuplicateGuideReadings([{ dayNumber: 1, scriptureReference: 'John 1:1-2' }, { dayNumber: 2, scriptureReference: 'John 2:1-2' }])).toEqual([]);
  });
  it('keeps Gospel framing separate, valid, AI-assisted and pending independent review', () => {
    expect(GOSPEL_FRAMING_DRAFT_SEED.map(d => d.dayStart)).toEqual([1, 25, 50, 75]);
    for (const draft of GOSPEL_FRAMING_DRAFT_SEED) {
      expect(draft.publicationStatus).toBe('draft'); expect(draft.theologicalReviewStatus).toBe('pending');
      expect(draft.reviewer).toBe('Human reviewer required before publication');
      expect(draft.aiAssisted).toBe(true); expect(isGospelReference(draft.scriptureReference!)).toBe(true);
      expect(draft.body).toContain('[JB/REVIEWER TO EDIT] DRAFT'); expect(validateFormationContent(draft)).toEqual([]);
    }
  });
  it.each([false, true])('shows the header book link only for a filled mapping (%s)', filled => {
    if (filled) vi.spyOn(mapping, 'getBookMappingForDay').mockReturnValue({ ...mapping.BOOK_DAY_MAPPING[0], status: 'jb_filled', chapter: 'JB supplied chapter' });
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'UTC' });
    const journey: FullyChargedTodayState = { attemptId: 'qa', sequenceNumber: 1, attemptStatus: 'active', rulesVersion: 'v1', contentBundleVersion: 'v1', startLocalDate: today, startTimezone: 'UTC', completedDays: 0, dayNumber: 1, localDate: today, season: 'be_with_jesus', dayStatus: 'open', opensAt: null, closesAt: null, localOnly: true };
    render(createElement(QueryClientProvider, { client: new QueryClient() }, createElement(FullyChargedJourneyPanel, { userId: 'qa', journey, history: [], localOnly: true, isLoading: false, isStarting: false, isClosing: false, error: null, onStart: vi.fn(), onClose: vi.fn(), onCancel: vi.fn() })));
    expect(Boolean(screen.queryByRole('link', { name: 'Read the related chapter' }))).toBe(filled);
    expect(screen.queryByText(/DRAFT — pending independent theological review/)).toBeNull();
  });
});
