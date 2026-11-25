/**
 * The full-text term of an advanced search query, for forwarding as ?fulltext
 * to the opened document (like the simple search's ?query term).
 *
 * Collects every positive `text_ocr` / `text_ocr.exact` condition, in any of
 * the shapes the advanced search writes: `text_ocr:(word)`,
 * `text_ocr:("two words")`, `text_ocr:"two words"`. A multi-word value stays
 * quoted, so the in-document search looks for the same phrase. Negated
 * conditions (`-text_ocr:…`) are skipped. Returns '' when there is none.
 */
export function advancedFulltextTerm(advancedQuery: string | null | undefined): string {
  if (!advancedQuery) return '';

  const pattern = /(^|[^\w.-])text_ocr(?:\.exact)?:\s*(?:\(([^()]*)\)|("+[^"]*"+)|([^\s()]+))/g;
  const terms: string[] = [];

  for (const match of advancedQuery.matchAll(pattern)) {
    const raw = match[2] ?? match[3] ?? match[4] ?? '';
    const value = raw.replace(/"/g, '').trim();
    if (!value) continue;
    const term = value.includes(' ') ? `"${value}"` : value;
    if (!terms.includes(term)) terms.push(term);
  }

  return terms.join(' ');
}
