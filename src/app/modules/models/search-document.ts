import {DocumentAccessibilityEnum} from '../constants/document-accessibility';
import {DocumentTypeEnum} from '../constants/document-type';

export interface SearchDocument {
  pid: string;
  title: string;
  rootTitle?: string;
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
}

export const parseSearchDocument = (doc: any): SearchDocument => ({
  pid: doc.pid,
  title: doc['title.search'],
  rootTitle: doc['root.title'],
  authors: doc.authors,
  date: doc['date.str'],
  model: doc.model,
  accessibility: doc.accessibility,
  licenses: doc.licenses,
  containsLicenses: doc.contains_licenses,
  access: doc.access,
  count_page: doc['count_page'] ? parseInt(doc['count_page'], 10) : undefined,
  languages: doc['languages.facet'] ? doc['languages.facet'] : undefined,
  highlighting: doc.highlighting ? doc.highlighting['text_ocr'] : undefined
});
