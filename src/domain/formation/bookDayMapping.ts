// JB fills in. Do not invent book content.
import type { CircuitType } from './circuits';

export interface BookDayMapping {
  dayNumber: number;
  chapter: string | null;
  concept: string | null;
  controllableFocus: CircuitType | null;
  status: 'placeholder' | 'jb_filled';
  notes?: string;
}
export const BOOK_DAY_MAPPING: readonly BookDayMapping[] = Array.from({ length: 75 }, (_, index) => ({
  dayNumber: index + 1, chapter: null, concept: null, controllableFocus: null, status: 'placeholder',
}));
export function getBookMappingForDay(day: number): BookDayMapping | undefined {
  return BOOK_DAY_MAPPING.find(entry => entry.dayNumber === day);
}
export function isBookMappingFilled(entry: BookDayMapping | undefined): entry is BookDayMapping {
  return entry?.status === 'jb_filled' && Boolean(entry.chapter?.trim());
}
export function validateBookDayMapping(entries: readonly BookDayMapping[] = BOOK_DAY_MAPPING): string[] {
  const errors: string[] = [];
  if (entries.length !== 75) errors.push('Expected 75 book mappings.');
  const days = new Set(entries.map(entry => entry.dayNumber));
  if (days.size !== entries.length) errors.push('Day numbers must be unique.');
  if (Array.from({ length: 75 }, (_, i) => i + 1).some(day => !days.has(day))) errors.push('Expected days 1 through 75.');
  if (entries.some(entry => entry.status === 'jb_filled' && !entry.chapter?.trim())) errors.push('Filled mappings require a chapter.');
  return errors;
}
