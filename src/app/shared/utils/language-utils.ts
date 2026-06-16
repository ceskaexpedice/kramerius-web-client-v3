/**
 * Utility functions for handling multilingual Solr fields
 */

import { getLanguageFallbackChain } from '../translation/translation-fallback-chain';

/**
 * Resolves a value from a `{ lang: value }` map using the language fallback chain
 * (current language → configured fallbacks → first available entry).
 *
 * @param byLang - Map keyed by app language code (e.g. { cs: '…', en: '…' })
 * @param currentLang - The current app language code
 * @returns The best-matching value, or '' when the map is empty
 *
 * @example
 * // current lang 'sk', map has only cs/en → returns the cs value
 * resolveLocalizedValue({ cs: 'Houbařské příručky', en: 'Mushroom guidebooks' }, 'sk')
 */
export function resolveLocalizedValue(
  byLang: { [lang: string]: string } | undefined | null,
  currentLang: string
): string {
  if (!byLang) return '';

  for (const lang of getLanguageFallbackChain(currentLang)) {
    if (byLang[lang]) return byLang[lang];
  }

  // Nothing in the preferred chain – fall back to the first available language.
  const available = Object.keys(byLang);
  return available.length > 0 ? byLang[available[0]] : '';
}

/**
 * Maps application language codes to Solr field suffixes
 */
export const APP_LANG_TO_SOLR_SUFFIX: Record<string, string> = {
  'cs': 'cze',  // Czech
  'en': 'eng',  // English
  'de': 'ger',  // German
  'sk': 'slo',  // Slovak
  'pl': 'pol',  // Polish
};

export const SOLR_LANG_TO_APP_LANG: Record<string, string> = {
  'cze': 'cs',
  'eng': 'en',
  'ger': 'de',
  'pol': 'pl',
  'slo': 'sk'
};

/**
 * Gets a localized field value from a Solr document based on the current language.
 * Tries language-specific field first, falls back to English if available, then base field.
 *
 * @param doc - The Solr document
 * @param fieldBase - The base field name (e.g., 'collection.desc', 'title.search')
 * @param currentLang - The current app language code (e.g., 'en', 'cs', 'sk')
 * @returns The localized field value or fallback
 *
 * @example
 * // For Slovak language (if Slovak not available, uses English):
 * getLocalizedField(doc, 'collection.desc', 'sk')
 * // Returns: doc['collection.desc_slo'] || doc['collection.desc_eng'] || doc['collection.desc'][0] || ''
 */
export function getLocalizedField(
  doc: any,
  fieldBase: string,
  currentLang: string = 'cs'
): string {
  if (!doc) return '';

  // Walk the language fallback chain (e.g. sk → cs → en), trying each language's
  // suffixed field (collection.desc_slo / _cze / _eng) in turn.
  for (const lang of getLanguageFallbackChain(currentLang)) {
    const solrSuffix = APP_LANG_TO_SOLR_SUFFIX[lang];
    if (!solrSuffix) continue;
    const field = doc[`${fieldBase}_${solrSuffix}`];
    if (field) {
      const value = Array.isArray(field) ? field[0] || '' : field;
      if (value) return value;
    }
  }

  // Fall back to base field if it's an array
  if (Array.isArray(doc[fieldBase]) && doc[fieldBase].length > 0) {
    return doc[fieldBase][0];
  }

  // Fall back to base field if it's a string
  if (typeof doc[fieldBase] === 'string') {
    return doc[fieldBase];
  }

  return '';
}

/**
 * Gets all language versions of a field from a Solr document.
 *
 * @param doc - The Solr document
 * @param fieldBase - The base field name (e.g., 'collection.desc')
 * @returns Object with language codes as keys and field values as values
 *
 * @example
 * getAllLanguageVersions(doc, 'collection.desc')
 * // Returns: { cs: '...', en: '...', de: '...' }
 */
export function getAllLanguageVersions(
  doc: any,
  fieldBase: string
): { [lang: string]: string } {
  if (!doc) return {};

  const versions: { [lang: string]: string } = {};

  Object.entries(APP_LANG_TO_SOLR_SUFFIX).forEach(([appLang, solrSuffix]) => {
    const langSpecificField = `${fieldBase}_${solrSuffix}`;

    if (doc[langSpecificField]) {
      versions[appLang] = Array.isArray(doc[langSpecificField])
        ? doc[langSpecificField][0] || ''
        : doc[langSpecificField];
    }
  });

  return versions;
}

/**
 * Gets the first available title from multilingual title fields.
 * Prefers the current language, falls back to English, then any available title.
 *
 * @param doc - The Solr document
 * @param currentLang - The current app language code
 * @returns The best matching title
 */
export function getLocalizedTitle(
  doc: any,
  currentLang: string = 'cs'
): string {
  if (!doc) return '';

  // Walk the language fallback chain (e.g. sk → cs → en), trying each language's
  // suffixed Solr field (title.search_slo / _cze / _eng) in turn.
  for (const lang of getLanguageFallbackChain(currentLang)) {
    const solrSuffix = APP_LANG_TO_SOLR_SUFFIX[lang];
    if (!solrSuffix) continue;
    const field = doc[`title.search_${solrSuffix}`];
    if (field) {
      const value = Array.isArray(field) ? field[0] || '' : field;
      if (value) return value;
    }
  }

  // Try generic title.search field
  if (doc['title.search']) {
    const value = Array.isArray(doc['title.search'])
      ? doc['title.search'][0] || ''
      : doc['title.search'];
    if (value) return value;
  }

  // Try titles.search array
  if (Array.isArray(doc['titles.search']) && doc['titles.search'].length > 0) {
    return doc['titles.search'][0];
  }

  // Fall back to root.title
  return doc['root.title'] || '';
}
