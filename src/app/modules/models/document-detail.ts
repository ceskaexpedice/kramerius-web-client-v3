export interface DocumentDetail {
  pid: string;
  title: string;
  titlesSearch: string[];
  accessibility: string;
  model: string;
  rootPid?: string;
  rootTitle?: string;
  rootModel?: string;
  dateStr?: string;
  dateMin?: string;
  dateMax?: string;
  dateRangeStartYear?: number;
  dateRangeEndYear?: number;
  authors?: string[];
  authorsFacet?: string[];
  publishers?: string[];
  publishersFacet?: string[];
  publicationPlaces?: string[];
  publicationPlacesFacet?: string[];
  physicalLocationsFacet?: string[];
  languagesFacet?: string[];
  licenses?: string[];
  licensesFacet?: string[];
  shelfLocators?: string[];
  countPage?: number;
  hasTiles?: boolean;
  level?: number;
  created?: string;
  modified?: string;
}

export function parseDocumentDetail(doc: any): DocumentDetail {
  return {
    pid: doc.pid,
    title: doc['title.search'],
    titlesSearch: doc['titles.search'] ?? [],
    accessibility: doc.accessibility,
    model: doc.model,
    rootPid: doc['root.pid'],
    rootTitle: doc['root.title'],
    rootModel: doc['root.model'],
    dateStr: doc['date.str'],
    dateMin: doc['date.min'],
    dateMax: doc['date.max'],
    dateRangeStartYear: doc['date_range_start.year'],
    dateRangeEndYear: doc['date_range_end.year'],
    authors: doc.authors,
    authorsFacet: doc['authors.facet'],
    publishers: doc['publishers.search'],
    publishersFacet: doc['publishers.facet'],
    publicationPlaces: doc['publication_places.search'],
    publicationPlacesFacet: doc['publication_places.facet'],
    physicalLocationsFacet: doc['physical_locations.facet'],
    languagesFacet: doc['languages.facet'],
    licenses: doc.licenses,
    licensesFacet: doc['licenses.facet'],
    shelfLocators: doc.shelf_locators,
    countPage: doc.count_page,
    hasTiles: doc.has_tiles,
    level: doc.level,
    created: doc.created,
    modified: doc.modified,
  };
}
