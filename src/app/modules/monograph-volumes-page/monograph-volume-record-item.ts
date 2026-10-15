import { RecordItem, searchDocumentToRecordItem } from '../../shared/components/record-item/record-item.model';
import { parseSearchDocument } from '../models/search-document';

// Volumes come from getChildrenByModel as raw Solr docs ('date.str',
// 'contains_licenses', …), while searchDocumentToRecordItem expects a parsed
// SearchDocument (`date`, `containsLicenses`). Mapping them directly dropped the
// volume year from the cards (issue #190), so parse first. The year also gets
// its own line: trailing the clamped authors it was cut off by the ellipsis.
export function monographVolumeToRecordItem(doc: any): RecordItem {
  return { ...searchDocumentToRecordItem(parseSearchDocument(doc)), dateBelowTitle: true };
}
