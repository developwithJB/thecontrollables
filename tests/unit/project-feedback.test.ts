// @vitest-environment jsdom
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { existsSync } from 'node:fs';
import { ProjectFeedbackNote } from '@/components/ProjectFeedback';
import { gospelReadingUrl } from '@/domain/formation/gospelAwareness';
import { FULLY_CHARGED_75_CONTENT_SEED } from '@/domain/formation/contentSeed';
afterEach(() => { cleanup(); history.replaceState({}, '', '/'); });
describe('public project feedback and Bible source', () => {
  it('opens the repository feedback form without copying private page or account context', () => {
    history.replaceState({}, '', '/formation/awareness?token=private&email=private%40example.com');
    render(createElement(ProjectFeedbackNote));
    const link = screen.getByRole('link', { name: 'Suggest a correction or improvement on GitHub' });
    const url = new URL(link.getAttribute('href')!);
    expect(url.origin + url.pathname).toBe('https://github.com/developwithJB/thecontrollables/issues/new');
    expect([...url.searchParams.entries()]).toEqual([['template', 'feedback.yml']]);
    expect(existsSync('.github/ISSUE_TEMPLATE/' + url.searchParams.get('template'))).toBe(true);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(screen.getByText(/GitHub feedback is public/)).toBeTruthy();
    expect(screen.getByText(/I study with the New Living Translation/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'View the project on GitHub' }).getAttribute('href')).toBe('https://github.com/developwithJB/thecontrollables');
  });
  it('links every draft to Bible.com in the NLT without changing review status', () => {
    for (const draft of FULLY_CHARGED_75_CONTENT_SEED) {
      const url = new URL(gospelReadingUrl(draft.scriptureReference!));
      expect(url.origin).toBe('https://www.bible.com');
      const usfm = decodeURIComponent(url.pathname).replace(/^\/bible\/116\//, '');
      expect(usfm).toMatch(/^(MAT|MRK|LUK|JHN)\.[1-9]\d*\.[1-9]\d*(-[1-9]\d*)?$/);
      expect(draft.sourceCitations).toEqual([url.href]);
      expect(draft.bibleTranslation).toContain('New Living Translation (NLT)');
      expect(draft.publicationStatus).toBe('draft');
      expect(draft.theologicalReviewStatus).toBe('pending');
    }
    expect(() => gospelReadingUrl('https://untrusted.example')).toThrow();
  });
});
