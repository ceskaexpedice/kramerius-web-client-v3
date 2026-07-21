/**
 * Escapes HTML special characters so a string can be safely interpolated into
 * markup that is bound via [innerHTML].
 *
 * Use this whenever untrusted or translated text is concatenated into an HTML
 * string by hand — Angular's interpolation escapes automatically, but
 * [innerHTML] does not.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
