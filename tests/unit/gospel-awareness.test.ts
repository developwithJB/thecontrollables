import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { FULLY_CHARGED_75_DAY_GUIDES, validateFullyChargedDayGuides, FULLY_CHARGED_COPY_REVIEW_STATUS, FULLY_CHARGED_CONTENT_BUNDLE_VERSION } from '@/domain/formation/fullyChargedJourney';
import { FULLY_CHARGED_75_CONTENT_SEED } from '@/domain/formation/contentSeed';
import { buildGospelAwarenessReading, formatGospelAwarenessReading, GOSPEL_AWARENESS_PROMPTS, readPublishedGospelAwareness } from '@/domain/formation/gospelAwareness';

describe('75-day Gospel-first Awareness', () => {
  it('assigns a Gospel passage and all three prompts to every day, including season boundaries', () => {
    expect(validateFullyChargedDayGuides()).toEqual([]);
    expect(FULLY_CHARGED_75_DAY_GUIDES).toHaveLength(75);
    for (const guide of FULLY_CHARGED_75_DAY_GUIDES) {
      expect(guide.scriptureReference).toMatch(/^(Matthew|Mark|Luke|John) /);
      expect(guide.awareness).toEqual({ scriptureReference: guide.scriptureReference, ...GOSPEL_AWARENESS_PROMPTS });
    }
    for (const day of [1, 25, 26, 50, 51, 75]) expect(FULLY_CHARGED_75_DAY_GUIDES[day - 1].awareness.respond).toBeTruthy();
  });
  it('serializes all 75 editorial drafts for the existing reviewed-content path without approving them', () => {
    for (const [index, draft] of FULLY_CHARGED_75_CONTENT_SEED.entries()) {
      expect(draft.version).toBe(2);
      expect(draft.aiAssisted).toBe(true);
      expect(draft.publicationStatus).toBe('draft');
      expect(draft.theologicalReviewStatus).toBe('pending');
      expect(draft.evidenceClassification).toBe('Scholarly Interpretation');
      expect(readPublishedGospelAwareness(draft)).toEqual(FULLY_CHARGED_75_DAY_GUIDES[index].awareness);
      expect(draft.sourceCitations).toHaveLength(1);
    }
    expect(FULLY_CHARGED_COPY_REVIEW_STATUS).toBe('pending');
    expect(FULLY_CHARGED_CONTENT_BUNDLE_VERSION).toBe('fully-charged-75-content-v1');
  });
  it('does not invent prompts for a missing, legacy, malformed, or non-Gospel published body', () => {
    expect(readPublishedGospelAwareness(null)).toBeNull();
    expect(readPublishedGospelAwareness({ scriptureReference: 'Mark 1:35-39', body: 'Existing reviewed copy' })).toBeNull();
    const reading = buildGospelAwarenessReading('John 13:1-17');
    const body = formatGospelAwarenessReading(reading);
    expect(readPublishedGospelAwareness({ scriptureReference: 'Acts 3:1-10', body })).toBeNull();
    expect(readPublishedGospelAwareness({ scriptureReference: reading.scriptureReference, body: body.replace(/\nRespond:.*$/, '') })).toBeNull();
    expect(readPublishedGospelAwareness({ scriptureReference: reading.scriptureReference, body: body.replace(reading.observe, '') })).toBeNull();
    expect(readPublishedGospelAwareness({ scriptureReference: reading.scriptureReference, body: body.replace(reading.observe, 'a'.repeat(601)) })).toBeNull();
    expect(() => buildGospelAwarenessReading('Romans 12:1-2')).toThrow(/Gospel/);
  });
  it('preserves reviewed server prompt text rather than replacing it with local drafts', () => {
    const body = 'Awareness 🦉 — Gospel-first\nObserve: Reviewed observation.\nUnderstand: Reviewed understanding.\nRespond: Reviewed response.';
    expect(readPublishedGospelAwareness({ scriptureReference: 'John 13:1-17', body })).toEqual({ scriptureReference: 'John 13:1-17', observe: 'Reviewed observation.', understand: 'Reviewed understanding.', respond: 'Reviewed response.' });
  });
  it('rejects a guide with any missing prompt and keeps the review ledger synchronized', () => {
    const broken = FULLY_CHARGED_75_DAY_GUIDES.map((guide, index) => index ? guide : { ...guide, awareness: { ...guide.awareness, understand: '' } });
    expect(validateFullyChargedDayGuides(broken)).toContain('Day 1 requires all three Gospel Awareness prompts for its passage.');
    const ledger = readFileSync('docs/christian-formation/fully-charged-75-day-recap.md', 'utf8');
    for (const [label, prompt] of Object.entries(GOSPEL_AWARENESS_PROMPTS)) {
      expect(ledger.split(`  - ${label[0].toUpperCase() + label.slice(1)}: ${prompt}`).length - 1).toBe(75);
    }
  });
});
