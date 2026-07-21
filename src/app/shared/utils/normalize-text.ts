/**
 * Normalizes text for comparison purposes: strips HTML tags and punctuation
 * (including typographic quotes and dashes), collapses whitespace and
 * lowercases the result.
 *
 * Intended for matching human-readable strings that may differ only in
 * formatting — not for display, and not a substitute for escaping.
 */
export function normalizeForComparison(text: string): string {
  return text
    .replace(/<[^>]*>/g, ' ')
    // Dashes become spaces so "out-of-commerce" matches "out of commerce";
    // the remaining punctuation is dropped outright.
    .replace(/[-–—]/g, ' ')
    .replace(/[„“”‘’"'?!.,:;]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
