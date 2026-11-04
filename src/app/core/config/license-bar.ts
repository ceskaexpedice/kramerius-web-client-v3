import { LicenseBarConfig, LocalizedLabel } from './config.interfaces';

/**
 * Brings a license's `bar` from `config-licenses.json` into the shape the client
 * relies on, or drops it when it cannot be made usable.
 *
 * The bar is hand-written per library, and a malformed one used to crash the whole
 * detail view (`bar.licenses.some` on `undefined`), leaving only a spinner. So:
 *  - `licenses` missing or empty → the license's own id (the bar belongs to it);
 *    a single string → a one-item list; non-string items are dropped.
 *  - `text` missing or a plain string → the license `label` / that string for
 *    every language, so the bar never renders `undefined`.
 */
export function normalizeLicenseBar(
  bar: unknown,
  licenseId: string,
  label?: LocalizedLabel,
): LicenseBarConfig | undefined {
  if (!bar || typeof bar !== 'object' || Array.isArray(bar)) return undefined;
  const raw = bar as Record<string, unknown>;

  const listed = typeof raw['licenses'] === 'string'
    ? [raw['licenses']]
    : Array.isArray(raw['licenses']) ? raw['licenses'] : [];
  const licenses = listed.filter((l): l is string => typeof l === 'string' && l.length > 0);

  const rawText = raw['text'];
  const text: LocalizedLabel =
    typeof rawText === 'string' ? { en: rawText }
    : rawText && typeof rawText === 'object' && !Array.isArray(rawText) ? rawText as LocalizedLabel
    : label ?? {};

  return {
    ...(raw as Partial<LicenseBarConfig>),
    licenses: licenses.length ? licenses : [licenseId],
    text,
  };
}
