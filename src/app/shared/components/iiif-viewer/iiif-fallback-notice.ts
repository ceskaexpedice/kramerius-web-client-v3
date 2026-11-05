/**
 * Why the IIIF viewer is showing only the thumbnail instead of the page.
 *
 * - `unavailable`: IIIF and the direct image both failed for a reason other than
 *   access (404, 5xx, network). Typically the member library behind CDK is down.
 * - `forbidden`: the direct image came back 401/403 - the page exists, but this
 *   user may not see it in full quality.
 */
export type FallbackReason = 'unavailable' | 'forbidden';

export interface FallbackNoticeText {
  titleKey: string;
  titleParams: Record<string, string>;
  messageKey: string;
  messageParams: Record<string, string>;
}

/**
 * Member libraries other than the one currently selected, in the document's
 * order. Empty when no library is selected (not CDK) - there is then no source
 * selector to point the reader to.
 */
export function alternativeSources(collections: readonly string[] | null | undefined, current: string | null): string[] {
  if (!current || !collections?.length) return [];
  return collections.filter(code => !!code && code !== current);
}

/**
 * Translation keys and params for the notice shown above a thumbnail fallback.
 * `libraryName` turns a library code into its display name (CDK serves those
 * as plain translation keys, e.g. `mzk` → "Moravská zemská knihovna v Brně").
 */
export function fallbackNoticeText(
  reason: FallbackReason,
  currentSource: string | null,
  alternatives: readonly string[],
  libraryName: (code: string) => string,
): FallbackNoticeText {
  let titleKey: string;
  let titleParams: Record<string, string> = {};
  if (reason === 'forbidden') {
    titleKey = 'iiif-fallback--forbidden-title';
  } else if (currentSource) {
    titleKey = 'iiif-fallback--unavailable-title-library';
    titleParams = { library: libraryName(currentSource) };
  } else {
    titleKey = 'iiif-fallback--unavailable-title';
  }

  // Only whether other libraries exist matters, not which: a title can be held
  // by many, and the "Source" selector already lists them.
  if (alternatives.length) {
    return { titleKey, titleParams, messageKey: 'iiif-fallback--message-other-sources', messageParams: {} };
  }
  return { titleKey, titleParams, messageKey: 'iiif-fallback--message', messageParams: {} };
}
