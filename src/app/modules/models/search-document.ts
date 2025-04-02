export interface SearchDocument {
  pid: string;
  title: string;
  rootTitle?: string;
  authors?: string[];
  date?: string;
  model: string;
  accessibility: string;
  licenses?: string[];
  containsLicenses?: string[];
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
  containsLicenses: doc.contains_licenses
});
