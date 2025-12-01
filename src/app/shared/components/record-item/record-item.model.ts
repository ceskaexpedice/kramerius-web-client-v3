import {DocumentTypeEnum} from "../../../modules/constants/document-type";

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
    monographUnitCount: doc.monographUnit_count || 0
  };
}

/**
 * Get appropriate title based on document type
 */
function getDocumentTitle(doc: any): string {
  switch (doc.model) {
    case 'monograph':
      return doc.title || '';
      case 'monographunit':
        return doc['title.search'];
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
