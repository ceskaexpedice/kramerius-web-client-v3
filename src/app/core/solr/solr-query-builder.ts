import {SolrFields} from './solr-fields';

export class SolrQueryBuilder {

  static baseParams(): any {
    return {
      q: '*:*',
      wt: 'json'
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

}
