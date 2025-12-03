import {DocumentTypeEnum} from '../../../modules/constants/document-type';

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
    licenses: doc.containsLicenses || doc.licenses || [],
    authors: doc.authors,
    date: doc.date,
    ownParentPid: doc.ownParentPid,
    highlighting: doc.highlighting,
    className: '',
    showFavoriteButton: true,
    showAccessibilityBadge: true,
    monographUnitCount: doc.monographUnit_count || 0,
  };
}

/**
 * Get appropriate title based on document type
 */
function getDocumentTitle(doc: any): string {
  switch (doc.model) {
    case DocumentTypeEnum.monograph:
      return doc.title || '';
    case DocumentTypeEnum.monographunit:
      return doc.title || doc.rootTitle || doc['title.search'] ;
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
