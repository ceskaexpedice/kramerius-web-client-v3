export const LANG_FALLBACK_CHAIN: Record<string, string[]> = {
  sk: ['cs', 'en'],
  cs: ['en'],
};

export const DEFAULT_LANG_FALLBACK = ['en'];

/**
 * Builds the ordered language preference chain for the given language: the
 * language itself followed by its configured fallbacks (e.g. 'sk' → ['sk','cs','en']).
 * Use this anywhere localized content needs to resolve to a single language version.
 */
export function getLanguageFallbackChain(lang: string): string[] {
  return [lang, ...(LANG_FALLBACK_CHAIN[lang] ?? DEFAULT_LANG_FALLBACK)];
}
