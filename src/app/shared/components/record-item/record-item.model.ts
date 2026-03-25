import { DocumentTypeEnum } from '../../../modules/constants/document-type';

/**
 * Simplified model for RecordItemComponent
 * Contains only the essential properties needed for display and functionality
 */
export interface RecordItem {
  /** Unique identifier (pid) */
  id: string;

  /** Main title to display */
  title: string;

  /** Optional subtitle */
  subtitle?: string;

  /** Document model/type for styling and URL generation */
  model: DocumentTypeEnum | '';

  /** Root document model (e.g. for pages, the model of the parent document) */
  rootModel?: DocumentTypeEnum;

  /** Licenses array for lock detection */
  licenses?: string[];

  /** Authors for subtitle display */
  authors?: string[];

  /** Date string for subtitle display */
  date?: string;

  /** Parent PID for pages (special URL handling) */
  ownParentPid?: string;

  /** OCR highlighting text for pages */
  highlighting?: string[];

  /** CSS class name */
  className?: string;

  /** Whether to show favorite button */
  showFavoriteButton?: boolean;

  /** Whether to show accessibility badge */
  showAccessibilityBadge?: boolean;

  monographUnitCount?: number;

  /** Custom image URL for local items */
  imageUrl?: string;

  /** External URL for local items */
  externalUrl?: string;

  /** Description for local items */
  description?: string;

  'collection.desc'?: string[];
  'collection.desc_cze'?: string[];
  'collection.desc_eng'?: string[];
  'collection.desc_pol'?: string[];
  'collection.desc_slo'?: string[];
}

/**
 * Convert SearchDocument to RecordItem
 */
export function searchDocumentToRecordItem(doc: any): RecordItem {
  return {
    id: doc.pid || '',
    title: getDocumentTitle(doc),
    subtitle: getDocumentSubtitle(doc),
    model: (doc.model as DocumentTypeEnum) || '',
    rootModel: doc.rootModel as DocumentTypeEnum | undefined,
    licenses: doc.containsLicenses || doc.licenses || doc['licenses.facet'] || [],
    authors: doc.authors,
    date: doc.date,
    ownParentPid: doc.ownParentPid,
    highlighting: doc.highlighting,
    className: '',
    showFavoriteButton: true,
    showAccessibilityBadge: true,
    monographUnitCount: doc.monographUnitCount || 0,

    'collection.desc': doc['collection.desc'] || [],
    'collection.desc_cze': doc['collection.desc_cze'] || [],
    'collection.desc_eng': doc['collection.desc_eng'] || [],
    'collection.desc_pol': doc['collection.desc_pol'] || [],
    'collection.desc_slo': doc['collection.desc_slo'] || [],
  };
}

/**
 * Get appropriate title based on document type
 */
function getDocumentTitle(doc: any): string {
  switch (doc.model) {
    case DocumentTypeEnum.monograph:
      return doc.title || doc['title.search'] || doc.rootTitle || '';
    case DocumentTypeEnum.monographunit:
      return doc.title || doc.rootTitle || doc['title.search'];
    case DocumentTypeEnum.periodical:
    case DocumentTypeEnum.periodicalvolume:
    case DocumentTypeEnum.page:
      return doc.rootTitle || '';
    case DocumentTypeEnum.article:
    case DocumentTypeEnum.supplement:
      return doc.title || '';
    default:
      return doc.rootTitle || doc.title || '';
  }
}

/**
 * Get appropriate subtitle based on document type
 */
function getDocumentSubtitle(doc: any): string {
  switch (doc.model) {
    case DocumentTypeEnum.article:
    case DocumentTypeEnum.supplement:
      return doc.rootTitle || '';
    default:
      return '';
  }
}

export function isDocumentPublic(licenses: string[], userLicenses: string[]) {
  // if there is some license in userLicenses that is in licenses, return true
  return userLicenses.some(userLicense => licenses.includes(userLicense));
}

// Re-export icon utility functions for backward compatibility
export { getModelIcon, getLanguageFlagIcon } from '../../utils/filter-icons.utils';
