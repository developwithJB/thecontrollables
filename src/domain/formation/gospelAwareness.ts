/** Reference-only pastoral guidance. New assignments remain drafts until independently reviewed. */
export const GOSPEL_AWARENESS_PROMPTS = {
  observe: 'What does this passage actually show about Jesus?',
  understand: 'What does it reveal about his character—and challenge in my assumptions?',
  respond: 'What is one honest truth I need to carry today?',
} as const;
export const GOSPEL_AWARENESS_BODY_MARKER = 'Awareness 🦉 — Gospel-first';
export interface GospelAwarenessReading {
  scriptureReference: string;
  observe: string;
  understand: string;
  respond: string;
}
export function isGospelReference(reference: string): boolean {
  return /^(Matthew|Mark|Luke|John) [1-9]\d?:[1-9]\d?(?:-[1-9]\d?)?$/.test(reference);
}
/** Awareness is the faith character: its Bible reference is Bible.com (YouVersion). Bible ID 116 = New Living Translation (NLT). */
const GOSPEL_BOOK_USFM = { Matthew: 'MAT', Mark: 'MRK', Luke: 'LUK', John: 'JHN' } as const;
export function gospelReadingUrl(scriptureReference: string): string {
  const match = scriptureReference.match(/^(Matthew|Mark|Luke|John) ([1-9]\d?):([1-9]\d?)(?:-([1-9]\d?))?$/);
  if (!match) throw new Error('Awareness requires a Gospel passage.');
  const book = GOSPEL_BOOK_USFM[match[1] as keyof typeof GOSPEL_BOOK_USFM];
  const passage = `${book}.${match[2]}.${match[3]}${match[4] ? `-${match[4]}` : ''}`;
  return `https://www.bible.com/bible/116/${passage}`;
}
export function buildGospelAwarenessReading(scriptureReference: string): GospelAwarenessReading {
  if (!isGospelReference(scriptureReference)) throw new Error('Awareness requires a Gospel passage.');
  return { scriptureReference, ...GOSPEL_AWARENESS_PROMPTS };
}
export function formatGospelAwarenessReading(reading: GospelAwarenessReading): string {
  return `${GOSPEL_AWARENESS_BODY_MARKER}\nObserve: ${reading.observe}\nUnderstand: ${reading.understand}\nRespond: ${reading.respond}`;
}
/** Parse only the body returned by the existing reviewed-content RPC. Never fall back to bundled drafts. */
export function readPublishedGospelAwareness(
  content: { scriptureReference: string | null; body: string } | null | undefined,
): GospelAwarenessReading | null {
  if (!content?.scriptureReference || !isGospelReference(content.scriptureReference)) return null;
  const lines = content.body.split('\n');
  const start = lines.indexOf(GOSPEL_AWARENESS_BODY_MARKER);
  if (start < 0) return null;
  const prefixes = ['Observe: ', 'Understand: ', 'Respond: '];
  const prompts = prefixes.map((prefix, index) => {
    const line = lines[start + index + 1];
    return line?.startsWith(prefix) ? line.slice(prefix.length).trim() : '';
  });
  if (prompts.some(prompt => !prompt || prompt.length > 600)) return null;
  return { scriptureReference: content.scriptureReference, observe: prompts[0], understand: prompts[1], respond: prompts[2] };
}
