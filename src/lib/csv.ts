/** Quote cells and neutralize spreadsheet formulas, including leading controls. */
export function csvCell(value: unknown): string {
  let text = String(value ?? "").replace(/[\r\n]/g, " ");
  let offset = 0;
  while (
    offset < text.length &&
    (text.charCodeAt(offset) <= 32 || /\s/u.test(text[offset]))
  )
    offset++;
  if (offset < text.length && "=+-@".includes(text[offset])) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
