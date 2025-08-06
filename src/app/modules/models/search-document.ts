import {DocumentAccessibilityEnum} from '../constants/document-accessibility';
import {DocumentTypeEnum} from '../constants/document-type';

export interface SearchDocument {
  pid: string;
  title: string;
  rootTitle?: string;
  rootPid?: string;
  ownParentPid?: string;
  authors?: string[];
  date?: string;
  model: DocumentTypeEnum;
  accessibility: DocumentAccessibilityEnum;
  licenses?: string[];
  containsLicenses?: string[];
  count_page?: number;
  languages?: string[];

  access: string;
  highlighting?: string[]
  year?: number;
  month?: number;
  day?: number;
}

export const parseSearchDocument = (doc: any): SearchDocument => ({
  pid: doc.pid,
  title: doc['title.search'],
  rootTitle: doc['root.title'],
  rootPid: doc['root.pid'],
  ownParentPid: doc['own_parent.pid'],
  authors: doc.authors,
  date: doc['date.str'],
  model: doc.model,
  accessibility: doc.accessibility,
  licenses: doc.licenses || doc['contains_licenses'] || doc['licenses.facet'] || [],
  containsLicenses: doc.contains_licenses,
  access: doc.access,
  count_page: doc['count_page'] ? parseInt(doc['count_page'], 10) : undefined,
  languages: doc['languages.facet'] ? doc['languages.facet'] : undefined,
  highlighting: doc.highlighting ? doc.highlighting['text_ocr'] : undefined,
  year: doc['date_range_start.year'] ? parseInt(doc['date_range_start.year'], 10) : undefined,
  month: doc['date_range_start.month'] ? parseInt(doc['date_range_start.month'], 10) : undefined,
  day: doc['date_range_start.day'] ? parseInt(doc['date_range_start.day'], 10) : undefined
});
