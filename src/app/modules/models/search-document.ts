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

  monographUnitCount?: number;
  publicationPlaces?: string[];
  keywords?: string[];
  mdt?: string;
  shelfLocators?: string[];
  idUrnnbn?: string;
  idOther?: string;
  physicalLocations?: string[];
  genres?: string[];

  'collection.desc'?: string;
  'collection.desc_cze'?: string;
  'collection.desc_eng'?: string;
  'collection.desc_pol'?: string;
  'collection.desc_slo'?: string;
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
  day: doc['date_range_start.day'] ? parseInt(doc['date_range_start.day'], 10) : undefined,
  monographUnitCount: doc['count_monograph_unit'] ? parseInt(doc['count_monograph_unit'], 10) : undefined,

  publicationPlaces: doc['publication_places.search'] ? doc['publication_places.search'] : undefined,
  keywords: doc['keywords.search'] ? doc['keywords.search'] : undefined,
  mdt: doc['mdt'] ? doc['mdt'] : undefined,
  shelfLocators: doc['shelf_locators'] ? doc['shelf_locators'] : undefined,
  idUrnnbn: doc['id_urnnbn'],
  idOther: doc['id_other'],
  physicalLocations: doc['physical_locations.facet'] ? doc['physical_locations.facet'] : undefined,
  genres: doc['genres.search'] ? doc['genres.search'] : undefined,

  'collection.desc': doc['collection.desc'],
  'collection.desc_cze': doc['collection.desc_cze'],
  'collection.desc_eng': doc['collection.desc_eng'],
  'collection.desc_pol': doc['collection.desc_pol'],
  'collection.desc_slo': doc['collection.desc_slo'],
});
