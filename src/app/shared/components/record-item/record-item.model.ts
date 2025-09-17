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
  model: string;

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
}

/**
 * Convert SearchDocument to RecordItem
 */
export function searchDocumentToRecordItem(doc: any): RecordItem {
  return {
    id: doc.pid || '',
    title: getDocumentTitle(doc),
    subtitle: getDocumentSubtitle(doc),
    model: doc.model || '',
    licenses: doc.containsLicenses || doc.licenses || [],
    authors: doc.authors,
    date: doc.date,
    ownParentPid: doc.ownParentPid,
    highlighting: doc.highlighting,
    className: '',
    showFavoriteButton: true,
    showAccessibilityBadge: false
  };
}

/**
 * Get appropriate title based on document type
 */
function getDocumentTitle(doc: any): string {
  switch (doc.model) {
    case 'monograph':
      return doc.title || '';
    case 'periodical':
    case 'periodicalvolume':
    case 'page':
      return doc.rootTitle || '';
    case 'article':
    case 'supplement':
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
    case 'article':
    case 'supplement':
      return doc.rootTitle || '';
    default:
      return '';
  }
}