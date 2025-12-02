import { DocumentTypeEnum } from '../../modules/constants/document-type';

/**
 * Get icon class for document model/type
 * @param model - Document type/model
 * @param monographUnitCount - Count of monograph units (affects icon for monographs)
 * @returns Icon class name or null if no icon
 */
export function getModelIcon(model: DocumentTypeEnum | string, monographUnitCount: number = 0): string | null {
  const modelKey = model.toLowerCase();

  switch (modelKey) {
    case DocumentTypeEnum.monograph:
      return monographUnitCount > 0 ? null : 'icon-book-1';
    case DocumentTypeEnum.monographunit:
      return 'icon-folder-open';
    case DocumentTypeEnum.periodical:
      return 'icon-firstline';
    case DocumentTypeEnum.collection:
      return 'icon-layer';
    case DocumentTypeEnum.map:
      return 'icon-map';
    case DocumentTypeEnum.graphic:
      return 'icon-brush-2';
    case DocumentTypeEnum.soundrecording:
      return 'icon-volume-high';
    case DocumentTypeEnum.sheetmusic:
      return 'icon-music';
    case DocumentTypeEnum.archive:
      return 'icon-folder-open';
    case DocumentTypeEnum.manuscript:
      return 'icon-path';
    case DocumentTypeEnum.convolute:
      return 'icon-archive-book';
    default:
      return null;
  }
}

/**
 * Get flag icon path for language code
 * Handles both ISO 639-1 (2-letter) and ISO 639-2/B (3-letter) codes
 * @param languageCode - Language code (e.g., 'en', 'eng', 'cze')
 * @returns Path to flag icon or null if not available
 */
export function getLanguageFlagIcon(languageCode: string): string | null {
  const code = languageCode.toLowerCase();

  // Mapping from ISO 639-2/B (3-letter) to ISO 639-1 (2-letter) codes
  const iso639_2_to_iso639_1: Record<string, string> = {
    'cze': 'cs',  // Czech
    'ces': 'cs',  // Czech (alternative)
    'ger': 'de',  // German
    'deu': 'de',  // German (alternative)
    'eng': 'en',  // English
    'spa': 'es',  // Spanish
    'est': 'et',  // Estonian
    'fre': 'fr',  // French
    'fra': 'fr',  // French (alternative)
    'hun': 'hu',  // Hungarian
    'ita': 'it',  // Italian
    'lat': 'lat', // Latin (no conversion needed)
    'lit': 'lt',  // Lithuanian
    'lav': 'lv',  // Latvian
    'pol': 'pl',  // Polish
    'por': 'pt',  // Portuguese
    'rus': 'ru',  // Russian
    'slo': 'sk',  // Slovak
    'slk': 'sk',  // Slovak (alternative)
    'slv': 'sl',  // Slovenian
    'swe': 'sv',  // Swedish
    'ukr': 'uk',  // Ukrainian
  };

  // Convert 3-letter code to 2-letter if needed
  const flagCode = iso639_2_to_iso639_1[code] || code;

  // List of available flag icons (2-letter codes)
  const availableFlags = ['cs', 'de', 'en', 'es', 'et', 'fr', 'hu', 'it', 'lat', 'lt', 'lv', 'pl', 'pt', 'ru', 'sk', 'sl', 'sv', 'uk'];

  if (availableFlags.includes(flagCode)) {
    return `/img/flags/flag_${flagCode}.png`;
  }

  return null;
}
