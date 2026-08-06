import { escapeHtml } from './escape-html';

/**
 * Matches bare URLs (http/https or www-prefixed) and e-mail addresses that are
 * written as plain text — translations frequently contain them, e.g.
 * "…najdete na webu https://dnnt.cz."
 */
const LINK_PATTERN = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;

/** Sentence punctuation that follows a URL but is not part of it. */
const TRAILING_PUNCTUATION = /[.,;:!?)\]}'"»„“]+$/;

/**
 * Escapes `text` and turns any bare URL or e-mail address in it into an anchor,
 * so plain-text copy can be rendered via [innerHTML] with working links.
 *
 * The whole string is escaped, so this is safe for translated or otherwise
 * untrusted text — no markup from the input survives.
 */
export function linkifyText(text: string): string {
  let result = '';
  let lastIndex = 0;

  for (const match of text.matchAll(LINK_PATTERN)) {
    const raw = match[0];
    const index = match.index ?? 0;
    const trailing = raw.match(TRAILING_PUNCTUATION)?.[0] ?? '';
    const token = trailing ? raw.slice(0, -trailing.length) : raw;

    result += escapeHtml(text.slice(lastIndex, index));
    result += token ? toAnchor(token) : '';
    result += escapeHtml(trailing);
    lastIndex = index + raw.length;
  }

  return result + escapeHtml(text.slice(lastIndex));
}

function toAnchor(token: string): string {
  const isEmail = !/^(https?:\/\/|www\.)/i.test(token) && token.includes('@');
  const href = isEmail
    ? `mailto:${token}`
    : /^www\./i.test(token)
      ? `https://${token}`
      : token;
  // External destinations open in a new tab; mailto: must stay in place.
  const attrs = isEmail ? '' : ' target="_blank" rel="noopener noreferrer"';

  return `<a href="${escapeHtml(href)}"${attrs}>${escapeHtml(token)}</a>`;
}
