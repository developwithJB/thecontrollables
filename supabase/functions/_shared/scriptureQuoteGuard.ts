// This is a conservative output filter, NOT proof that arbitrary AI prose is
// Scripturally accurate. Licensed text is never sent to a model by this path.
export const SCRIPTURE_QUOTE_FALLBACK =
  "I can help you reflect, but I cannot present an unverified Bible quotation. Read the passage in context on https://www.bible.com/ and distinguish its words from my guidance.\n\n→ ACTION: Read, notice what you learn about Jesus, and choose one honest response.";
const citation =
  /\b(?:(?:[1-3]\s*)?(?:Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|Samuel|Kings|Chronicles|Ezra|Nehemiah|Esther|Job|Psalms?|Proverbs|Ecclesiastes|Song of (?:Songs|Solomon)|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Matt|Mark|Luke|John|Acts|Romans|Corinthians|Galatians|Ephesians|Philippians|Colossians|Thessalonians|Timothy|Titus|Philemon|Hebrews|James|Peter|Jude|Revelation))\.?\s+\d{1,3}:\d{1,3}/i;
export function withholdUnverifiedScripture(message: string): string {
  const attribution =
    /\b(?:God|Jesus|Scripture|the Bible|the Lord)\s+(?:says?|said|declares?|promises?|tells? us)\b/i;
  const verifiedClaim =
    /\b(?:verified|exact|word.for.word)\s+(?:Bible|Scripture|biblical)\s+quot(?:e|ation)/i;
  return (citation.test(message) && /["“”«»]|(?:^|\n)\s*>/.test(message)) ||
    attribution.test(message) ||
    verifiedClaim.test(message)
    ? SCRIPTURE_QUOTE_FALLBACK
    : message;
}
export function guardCoachScriptureResponse(value: unknown): unknown {
  if (
    !value ||
    typeof value !== "object" ||
    !("choices" in value) ||
    !Array.isArray(value.choices)
  )
    return value;
  return {
    ...value,
    choices: value.choices.map((choice: unknown) => {
      if (
        !choice ||
        typeof choice !== "object" ||
        !("message" in choice) ||
        !choice.message ||
        typeof choice.message !== "object"
      )
        return choice;
      const message = choice.message;
      return "content" in message && typeof message.content === "string"
        ? {
            ...choice,
            message: {
              ...message,
              content: withholdUnverifiedScripture(message.content),
            },
          }
        : choice;
    }),
  };
}
