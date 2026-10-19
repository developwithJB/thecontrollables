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
export const BOOK_DAY_MAPPING: readonly BookDayMapping[] = [
  { dayNumber: 1, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 2, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 3, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 4, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 5, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 6, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 7, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 8, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 9, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 10, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 11, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 12, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 13, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 14, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 15, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 16, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 17, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 18, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 19, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 20, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 21, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 22, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 23, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 24, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 25, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 26, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 27, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 28, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 29, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 30, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 31, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 32, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 33, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 34, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 35, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 36, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 37, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 38, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 39, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 40, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 41, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 42, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 43, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 44, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 45, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 46, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 47, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 48, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 49, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 50, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 51, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 52, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 53, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 54, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 55, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 56, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 57, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 58, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 59, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 60, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 61, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 62, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 63, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 64, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 65, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 66, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 67, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 68, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 69, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 70, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 71, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 72, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 73, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 74, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
  { dayNumber: 75, chapter: null, concept: null, controllableFocus: null, status: 'placeholder' },
];
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
