import {PeriodicalItem} from '../../modules/models/periodical-item';
import {BookItem} from '../../modules/models/book-item';
import { FacetItem } from '../../modules/models/facet-item';

export class SolrResponseParser {

  static parsePeriodicalItems(response: any): PeriodicalItem[] {
    const docs = response?.response?.docs ?? [];
    return docs.map((doc: any) => ({
      uuid: doc['pid'],
      title: doc['root.title'] || doc['title.search'] || '-',
      dateRange: doc['date.str'] || '',
      accessibility: doc['accessibility'] || 'unknown',
      licenses: doc['licenses.facet'] || doc['contains_licenses'] || [],
      publishers: doc['publishers.search'] || [],
      publicationPlaces: doc['publication_places.facet'] || [],
      languages: doc['languages.facet'] || [],
      keywords: doc['keywords.facet'] || [],
      geographicNames: doc['geographic_names.facet'] || [],
      genres: doc['genres.facet'] || [],
      shelfLocators: doc['shelf_locators'] || [],
      created: doc['created'],
      modified: doc['modified'],
      hasTiles: doc['has_tiles'] ?? false
    }));
  }

  static parseBookItems(response: any): BookItem[] {
    const docs = response?.response?.docs ?? [];

    return docs.map((doc: any) => ({
      uuid: doc.pid,
      title: doc['root.title'] || '—',
      accessibility: doc.accessibility || '',
      licenses: doc['licenses.facet'] ?? [],
      ccnbIds: doc.id_ccnb ?? [],
      oclcIds: doc.id_oclc ?? [],
      created: doc.created ?? '',
      modified: doc.modified ?? '',
      indexerVersion: doc.indexer_version ?? 0,
      hasTiles: doc.has_tiles ?? false
    }));
  }

  static parseFacetField<T>(response: any, field: string, mapper: (value: string, count: number) => T): T[] {
    const raw = response?.facet_counts?.facet_fields?.[field] ?? [];
    const result: T[] = [];

    for (let i = 0; i < raw.length; i += 2) {
      result.push(mapper(raw[i], raw[i + 1]));
    }

    return result;
  }

  static mapToGenreItem(value: string, count: number): FacetItem {
    return { name: value, count };
  }

  static parseAllFacets(fields: any): { [key: string]: FacetItem[] } {
    const parsed: { [key: string]: FacetItem[] } = {};

    for (const key in fields) {
      const raw = fields[key];
      parsed[key] = [];

      for (let i = 0; i < raw.length; i += 2) {
        parsed[key].push({ name: raw[i], count: raw[i + 1] });
      }
    }

    return parsed;
  }

  static parseFacet(data: any[]): { name: string; count: number }[] {
    const items: { name: string; count: number }[] = [];

    for (let i = 0; i < data.length; i += 2) {
      const name = data[i];
      const count = data[i + 1];
      items.push({ name, count });
    }

    return items;
  }

}
