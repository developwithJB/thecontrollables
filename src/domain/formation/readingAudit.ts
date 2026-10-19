import type { FullyChargedDayGuide } from './fullyChargedJourney';

type Reading = Pick<FullyChargedDayGuide, 'dayNumber' | 'scriptureReference'>;
export interface ReadingReviewFlag {
  kind: 'exact' | 'overlap';
  references: string[];
  days: number[];
}
/** Editorial warnings only: repeated readings never invalidate or alter a guide. */
export function findDuplicateGuideReadings(guides: readonly Reading[]): ReadingReviewFlag[] {
  const groups = new Map<string, number[]>();
  for (const guide of guides) groups.set(guide.scriptureReference, [...(groups.get(guide.scriptureReference) ?? []), guide.dayNumber]);
  const result: ReadingReviewFlag[] = [...groups].filter(([, days]) => days.length > 1)
    .map(([reference, days]) => ({ kind: 'exact', references: [reference], days }));
  const ranges = [...groups].flatMap(([reference, days]) => {
    const match = /^(Matthew|Mark|Luke|John) (\d+):(\d+)(?:-(\d+))?$/.exec(reference);
    return match ? [{ reference, days, book: match[1], chapter: Number(match[2]), from: Number(match[3]), to: Number(match[4] ?? match[3]) }] : [];
  });
  for (let i = 0; i < ranges.length; i++) for (let j = i + 1; j < ranges.length; j++) {
    const a = ranges[i], b = ranges[j];
    if (a.book === b.book && a.chapter === b.chapter && Math.max(a.from, b.from) <= Math.min(a.to, b.to)) {
      result.push({ kind: 'overlap', references: [a.reference, b.reference], days: [...a.days, ...b.days].sort((x, y) => x - y) });
    }
  }
  return result;
}
