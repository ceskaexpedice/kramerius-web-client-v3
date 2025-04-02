import {SolrFields} from './solr-fields';

export class SolrQueryBuilder {

  static baseParams(): any {
    return {
      q: '*:*',
      wt: 'json'
    };
  }

  static baseFilters(): any {
    return {
      fq: `(model:monograph OR model:periodical OR (model:collection AND collection.is_standalone:true) OR model:graphic OR model:map OR model:sheetmusic OR model:soundrecording OR model:archive OR model:manuscript OR model:convolute OR model:monographunit)`
    };
  }

  static filterByModel(model: string): any {
    return {
      fq: `${SolrFields.model}:${model}`
    };
  }

  static sortByCreated(desc: boolean = true): any {
    return {
      sort: `${SolrFields.createdAt} ${desc ? 'desc' : 'asc'}`
    };
  }

  static facet(field: string, limit = 20, sort = 'count'): any {
    return {
      facet: true,
      'facet.field': field,
      'facet.limit': limit,
      'facet.sort': sort
    };
  }

  static rows(rows: number): any {
    return {
      rows: rows
    };
  }

  static start(start: number): any {
    return {
      start: start
    };
  }

  static facetByField(field: string, limit = 20, sort: 'count' | 'index' = 'count'): any {
    return {
      ...SolrQueryBuilder.baseParams(),
      rows: 0,
      facet: true,
      'facet.field': field,
      'facet.limit': limit,
      'facet.sort': sort
    };
  }

  static facetByModel(): any {
    return this.facetByField('model');
  }

  static facetFields(fields: string[]): Record<string, any> {
    return {
      facet: 'true',
      'facet.mincount': '1',
      'facet.field': fields
    };
  }

  static fieldsToReturn(fields: string[]): Record<string, any> {
    return {
      fl: fields.join(',')
    };
  }

  static filterQueries(filters: string[]): Record<string, any> {
    return {
      fq: filters
    };
  }

  static pagination(start: number, rows: number): Record<string, any> {
    return {
      start: start.toString(),
      rows: rows.toString()
    };
  }

  static facetFilter(field: string, values: string[]): string | null {
    if (!values.length) return null;

    const escapedValues = values.map(v => `"${v}"`); // ošetrenie medzier, diakritiky
    return `${field}:(${escapedValues.join(' OR ')})`;
  }

  static filterExcluding(filters: string[], excludePrefix: string): string[] {
    return filters.filter(fq => !fq.startsWith(excludePrefix + ':'));
  }

}
