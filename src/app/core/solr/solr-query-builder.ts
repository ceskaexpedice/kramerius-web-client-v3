import { SolrFields } from './solr-fields';
import { SolrOperators, SolrSortDirections, SolrSortFields } from './solr-helpers';

export class SolrQueryBuilder {

  private static configuredModels: string[] = [];

  private static boostMap: Record<string, number> = {
    'periodical': 10,
    'monograph': 8
  };

  static setConfiguredModels(models: string[]): void {
    SolrQueryBuilder.configuredModels = models;
  }

  private static buildModelList(includePeriodicalItem: boolean, includePage: boolean, includeSupplement: boolean = true, includeArticle: boolean = true, withBoosts: boolean = true): string[] {
    const models = SolrQueryBuilder.configuredModels.length > 0
      ? SolrQueryBuilder.configuredModels
      : ['periodical', 'monograph', 'map', 'graphic', 'archive', 'manuscript', 'soundrecording', 'sheetmusic', 'convolute', 'collection', 'monographunit', 'supplement', 'article'];

    const result = models
      .filter(m => {
        // These are conditionally added via flags, not part of the base list
        if (m === 'page') return false;
        if (!includePeriodicalItem && (m === 'periodicalitem' || m === 'periodicalvolume')) return false;
        if (!includeSupplement && m === 'supplement') return false;
        if (!includeArticle && m === 'article') return false;
        return true;
      })
      .map(m => {
        if (!withBoosts) return `model:${m}`;
        const boost = SolrQueryBuilder.boostMap[m] ?? 2;
        return `model:${m}^${boost}`;
      });

    if (includePeriodicalItem) {
      if (!result.some(r => r.startsWith('model:periodicalitem'))) {
        result.push(withBoosts ? 'model:periodicalitem^2' : 'model:periodicalitem');
      }
      if (!result.some(r => r.startsWith('model:periodicalvolume'))) {
        result.push(withBoosts ? 'model:periodicalvolume^2' : 'model:periodicalvolume');
      }
    }
    if (includePage) {
      result.push(withBoosts ? 'model:page^0.001' : 'model:page');
    }

    return result;
  }

  static baseParams(): any {
    return {
      q: '*:*',
      wt: 'json'
    };
  }

  static basePeriodicalFilters(includePeriodicalItem: boolean = false, includePage: boolean = false, rootPid: string | null = null): any {
    // fq is a pure filter — boosts are ignored by Solr here, so list models without them.
    const baseModels = [
      'model:periodical'
    ];

    if (includePeriodicalItem) {
      baseModels.push('model:periodicalitem');
      baseModels.push('model:periodicalvolume');
    }
    if (includePage) {
      baseModels.push('model:page');
    }

    return {
      fq: `(${baseModels.join(' OR ')})`
    };
  }

  static pageFilter() {
    return {
      fq: `${SolrFields.model}:page`
    };
  }

  static baseFilters(includePeriodicalItem: boolean = false, includePage: boolean = false, includeSupplement: boolean = true, includeArticle: boolean = true): any {
    // fq is a pure filter — Solr ignores boosts here, so emit the model list without them.
    const baseModels = SolrQueryBuilder.buildModelList(includePeriodicalItem, includePage, includeSupplement, includeArticle, false);

    return {
      fq: `(${baseModels.join(' OR ')})`
    };
  }

  /**
   * Alternative method for generating boosted model queries to be used in the main query (q parameter)
   * This provides stronger boosting control than filter queries
   */
  static buildBoostedModelQuery(includePeriodicalItem: boolean = false, includePage: boolean = false, periodicalOnly = false, includeSupplement: boolean = true, includeArticle: boolean = true): string {
    if (periodicalOnly) {
      const baseModels = ['model:periodical^10'];
      if (includePeriodicalItem) {
        baseModels.push('model:periodicalitem^2');
        baseModels.push('model:periodicalvolume^2');
      }
      if (includePage) {
        baseModels.push('model:page^0.001');
      }
      return `(${baseModels.join(' OR ')})`;
    }

    const baseModels = SolrQueryBuilder.buildModelList(includePeriodicalItem, includePage, includeSupplement, includeArticle);
    return `(${baseModels.join(' OR ')})`;
  }

  // static baseFilters(): any {
  //   return {
  //     fq: `(level: 0) AND (accessibility:public)`
  //   };
  // }

  static filterByModel(model: string, valueOnly = false): any {
    if (valueOnly) return `${SolrFields.model}:${model}`;

    return {
      fq: `${SolrFields.model}:${model}`
    };
  }

  static sortBy(field = SolrSortFields.createdAt, direction = SolrSortDirections.desc): any {
    return {
      sort: `${field} ${direction}`
    };
  }

  static facetSortBy(field = SolrSortFields.createdAt): any {
    return {
      'facet.sort': `${field}`
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

  static accessibilityPublic(valueOnly = false): any {
    if (valueOnly) return `${SolrFields.accessibility}:public`;
    return {
      fq: `${SolrFields.accessibility}:public`
    };
  }

  static level0(valueOnly = false): any {
    if (valueOnly) return `level:0`;
    return {
      fq: `level:0`
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

  static facetFields(fields: string[], minCount = 1, facetThreads?: number | null): Record<string, any> {
    const params: Record<string, any> = {
      facet: 'true',
      'facet.mincount': `${minCount}`,
      'facet.field': fields
    };
    // facet.threads parallelizes faceting across fields. Only sent when configured
    // (env.json key `solrFacetThreads`); -1 means one thread per field.
    if (facetThreads !== undefined && facetThreads !== null) {
      params['facet.threads'] = `${facetThreads}`;
    }
    return params;
  }

  static facetContains(contains: string, ignoreCase: boolean = true): Record<string, any> {
    return {
      'facet.contains': contains,
      'facet.contains.ignoreCase': ignoreCase ? 'true' : 'false'
    };
  }

  // &hl=true&hl.fl=text_ocr&hl.method=original&hl.snippets=1&hl.fragsize=120&hl.simple.pre=<strong>&hl.simple.post=</strong>
  static highlight(fields: string[] = ['text_ocr'], snippets: number = 1, fragsize: number = 120): Record<string, any> {
    return {
      hl: 'true',
      'hl.fl': fields.join(','),
      'hl.method': 'original',
      'hl.snippets': snippets.toString(),
      'hl.fragsize': fragsize.toString(),
      'hl.simple.pre': '<strong>',
      'hl.simple.post': '</strong>'
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

    const escapedValues = values.map(v => `"${v}"`);
    return `${field}:(${escapedValues.join(' OR ')})`;
  }

  static filterExcluding(filters: string[], excludePrefix: string): string[] {
    return filters.filter(fq => !fq.startsWith(excludePrefix + ':'));
  }

  static escapeSolrQuery(input: string): string {
    // Escape special characters for Solr query syntax
    if (!input) return input;
    //     input.replace(/([+\-!(){}\[\]^~:\\])/g, '\\$1');
    return input.replace(/([+\-!(){}\[\]^~:\\/*?"])/g, '\\$1');

  }

  static buildQueryFromInput(
    input: string,
    operator: SolrOperators.and | SolrOperators.or = SolrOperators.and,
    field: string | string[] = 'titles.search'
  ): string {
    const trimmed = input.trim();
    if (!trimmed) return '*:*';

    const words = trimmed.split(/\s+/).map((term, i, arr) => {
      const escaped = this.escapeSolrQuery(term);
      return i === arr.length - 1 ? `${escaped}*` : escaped;
    });

    const queryBody = words.join(` ${operator} `);

    if (Array.isArray(field)) {
      const fieldQueries = field.map(f => `${f}:(${queryBody})`);
      return `(${fieldQueries.join(` ${SolrOperators.or} `)})`;
    }

    return `${field}:(${queryBody})`;
  }

  static buildBooleanQuery(conditions: string[]): string {
    return conditions.join(` ${SolrOperators.and} `);
  }

  /**
   * Returns true if the query contains special Solr search operators that should be
   * passed directly to Solr without term-splitting or wildcard injection.
   * Supported: * ? AND OR NOT "phrase" ~n (proximity/fuzzy)
   */
  static hasSpecialOperators(query: string): boolean {
    if (/[*?~]/.test(query)) return true;
    if (/"[^"]+"/.test(query)) return true;
    if (/\b(AND|OR|NOT)\b/.test(query)) return true;
    return false;
  }

  static sanitizeSearchTerms(query: string): string {
    // Preserve quoted phrases
    if (query.startsWith('"') && query.endsWith('"')) {
      return query;
    }

    return query
      .replace(/[:\(\)\[\]\{\}~^\\\/;.!,]/g, ' ')  // Keep * ? " for wildcards/phrases
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Removes diacritics from a string (ASCII folding)
   */
  static removeDiacritics(str: string): string {
    return str.normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  /**
   * Builds the multi-field free-text search clause used by the main search
   * (the "simple search" variant: title/titles/authors/keywords/genres/OCR/ISBN/
   * shelf-locators with boosting and diacritic folding). Shared between the main
   * Solr search and the saved-lists (folder) search so a free-text term hits the
   * same attributes in both places.
   *
   * Returns a parenthesised OR clause, or `*:*` when the query is empty.
   */
  static buildSearchClause(query: string): string {
    if (!query?.trim()) {
      return '*:*';
    }

    if (this.hasSpecialOperators(query)) {
      // Query uses special operators — pass directly to Solr without term-splitting
      // or wildcard injection. If no explicit boolean operators, join multiple terms
      // with AND so "Kar* Háj*" → "Kar* AND Háj*".
      const hasExplicitBooleans = /\b(AND|OR|NOT)\b/.test(query) || /"[^"]+"/.test(query);
      const normalizedQuery = !hasExplicitBooleans
        ? query.trim().split(/\s+/).join(' AND ')
        : query;
      const startsWithNot = /^\s*NOT\b/i.test(query);
      if (startsWithNot) {
        // Leading NOT: rewrite "NOT term" as exclusion from all docs
        const excluded = query.replace(/^\s*NOT\s+/i, '').trim();
        return `(*:* NOT (title.search:${excluded} OR titles.search:${excluded} OR text_ocr:${excluded}))`;
      }
      const queryParts = [
        `title.search:(${normalizedQuery})^3`,
        `titles.search:(${normalizedQuery})`,
        `authors.search:(${normalizedQuery})^2`,
        `keywords.search:(${normalizedQuery})`,
        `genres.search:(${normalizedQuery})`,
        `text_ocr:(${normalizedQuery})^0.1`,
        `id_isbn:(${normalizedQuery})`,
        `shelf_locators:(${normalizedQuery})`
      ];
      return `(${queryParts.join(' OR ')})`;
    }

    const sanitizedQuery = this.sanitizeSearchTerms(query);
    const terms = sanitizedQuery.split(/\s+/).filter(t => t.length > 0);

    if (terms.length === 0) {
      return '*:*';
    }

    // Convert terms to lowercase and create ASCII-folded versions
    const lowerTerms = terms.map(t => t.toLowerCase());

    const q = lowerTerms.join(' AND ');
    const qAscii = lowerTerms.map(t => this.removeDiacritics(t)).join(' AND ');
    const hasDiacritics = q !== qAscii;

    const queryParts = [
      `title.search:(${q})^3`,
      `titles.search:(${q})`,
      `authors.search:(${q})^2`,
      `keywords.search:(${q})`,
      `genres.search:(${q})`,
      `text_ocr:(${q})^0.1`,
      `id_isbn:(${q})`,
      `shelf_locators:(${q})`
    ];
    if (hasDiacritics) {
      queryParts.push(
        `title.search:(${qAscii})^1.5`,
        `titles.search:(${qAscii})^0.8`,
        `authors.search:(${qAscii})^1.5`,
        `text_ocr:(${qAscii})^0.05`
      );
    }
    return `(${queryParts.join(' OR ')})`;
  }

}
