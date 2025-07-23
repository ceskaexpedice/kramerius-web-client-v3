// import {SolrFields} from './solr-fields';
// import {SolrOperators, SolrSortDirections, SolrSortFields} from './solr-helpers';
//
// export class SolrQueryBuilder {
//
//   static baseParams(): any {
//     return {
//       q: '*:*',
//       wt: 'json'
//     };
//   }
//
//   static baseFilters(includePeriodicalItem: boolean = false, includePage: boolean = false): any {
//     const baseModels = [
//       'model:periodical',
//       'model:monograph',
//       'model:map',
//       'model:graphic',
//       'model:archive',
//       'model:manuscript',
//       'model:soundrecording',
//       'model:sheetmusic',
//       'model:convolute',
//       '(model:collection AND collection.is_standalone:true)',
//       'model:monographunit',
//       'model:supplement',
//       'model:article'
//     ];
//
//     if (includePeriodicalItem) baseModels.push('model:periodicalitem');
//     if (includePeriodicalItem) baseModels.push('model:periodicalvolume');
//     if (includePage) baseModels.push('model:page');
//
//     return {
//       fq: `(${baseModels.join(' OR ')})`
//     };
//   }
//
//
//   // static baseFilters(): any {
//   //   return {
//   //     fq: `(level: 0) AND (accessibility:public)`
//   //   };
//   // }
//
//   static filterByModel(model: string, valueOnly = false): any {
//     if (valueOnly) return `${SolrFields.model}:${model}`;
//
//     return {
//       fq: `${SolrFields.model}:${model}`
//     };
//   }
//
//   static sortBy(field = SolrSortFields.createdAt, direction = SolrSortDirections.desc): any {
//     return {
//       sort: `${field} ${direction}`
//     };
//   }
//
//   static facetSortBy(field = SolrSortFields.createdAt): any {
//     return {
//       'facet.sort': `${field}`
//     };
//   }
//
//   static facet(field: string, limit = 20, sort = 'count'): any {
//     return {
//       facet: true,
//       'facet.field': field,
//       'facet.limit': limit,
//       'facet.sort': sort
//     };
//   }
//
//   static rows(rows: number): any {
//     return {
//       rows: rows
//     };
//   }
//
//   static start(start: number): any {
//     return {
//       start: start
//     };
//   }
//
//   static accessibilityPublic(valueOnly = false): any {
//     if (valueOnly) return `${SolrFields.accessibility}:public`;
//     return {
//       fq: `${SolrFields.accessibility}:public`
//     };
//   }
//
//   static level0(valueOnly = false): any {
//     if (valueOnly) return `level:0`;
//     return {
//       fq: `level:0`
//     };
//   }
//
//   static facetByField(field: string, limit = 20, sort: 'count' | 'index' = 'count'): any {
//     return {
//       ...SolrQueryBuilder.baseParams(),
//       rows: 0,
//       facet: true,
//       'facet.field': field,
//       'facet.limit': limit,
//       'facet.sort': sort
//     };
//   }
//
//   static facetByModel(): any {
//     return this.facetByField('model');
//   }
//
//   static facetFields(fields: string[], minCount = 1): Record<string, any> {
//     return {
//       facet: 'true',
//       'facet.mincount': `${minCount}`,
//       'facet.field': fields
//     };
//   }
//
//   static facetContains(contains: string, ignoreCase: boolean = true): Record<string, any> {
//     return {
//       'facet.contains': contains,
//       'facet.contains.ignoreCase': ignoreCase ? 'true' : 'false'
//     };
//   }
//
//   static fieldsToReturn(fields: string[]): Record<string, any> {
//     return {
//       fl: fields.join(',')
//     };
//   }
//
//   static filterQueries(filters: string[]): Record<string, any> {
//     return {
//       fq: filters
//     };
//   }
//
//   static pagination(start: number, rows: number): Record<string, any> {
//     return {
//       start: start.toString(),
//       rows: rows.toString()
//     };
//   }
//
//   static facetFilter(field: string, values: string[]): string | null {
//     if (!values.length) return null;
//
//     const escapedValues = values.map(v => `"${v}"`);
//     return `${field}:(${escapedValues.join(' OR ')})`;
//   }
//
//   static filterExcluding(filters: string[], excludePrefix: string): string[] {
//     return filters.filter(fq => !fq.startsWith(excludePrefix + ':'));
//   }
//
//   static escapeSolrQuery(input: string): string {
//     // Escape special characters for Solr query syntax
//     if (!input) return input;
//
//     return input.replace(/([+\-!(){}\[\]^~:\\])/g, '\\$1');
//
//   }
//
//   static buildQueryFromInput(
//     input: string,
//     operator: SolrOperators.and | SolrOperators.or = SolrOperators.and,
//     field: string | string[] = 'titles.search'
//   ): string {
//     const trimmed = input.trim();
//     if (!trimmed) return '*:*';
//
//     const words = trimmed.split(/\s+/).map((term, i, arr) => {
//       const escaped = this.escapeSolrQuery(term);
//       return i === arr.length - 1 ? `${escaped}*` : escaped;
//     });
//
//     const queryBody = words.join(` ${operator} `);
//
//     if (Array.isArray(field)) {
//       const fieldQueries = field.map(f => `${f}:(${queryBody})`);
//       return `(${fieldQueries.join(` ${SolrOperators.or} `)})`;
//     }
//
//     return `${field}:(${queryBody})`;
//   }
//
//
//   static buildBooleanQuery(conditions: string[]): string {
//     return conditions.join(` ${SolrOperators.and} `);
//   }
//
// }


import {SolrFields} from './solr-fields';
import {SolrOperators, SolrSortDirections, SolrSortFields} from './solr-helpers';

export class SolrQueryBuilder {

  static baseParams(): any {
    return {
      q: '*:*',
      wt: 'json'
    };
  }

  static baseFilters(includePeriodicalItem: boolean = false, includePage: boolean = false): any {
    const baseModels = [
      'model:periodical^10',    // High boost for periodicals
      'model:monograph^8',      // High boost for monographs
      'model:map^2',
      'model:graphic^2',
      'model:archive^2',
      'model:manuscript^2',
      'model:soundrecording^2',
      'model:sheetmusic^2',
      'model:convolute^2',
      '(model:collection AND collection.is_standalone:true)^2',
      'model:monographunit^2',
      'model:supplement^2',
      'model:article^2'
    ];

    if (includePeriodicalItem) {
      baseModels.push('model:periodicalitem^2');
      baseModels.push('model:periodicalvolume^2');
    }
    if (includePage) {
      baseModels.push('model:page^0.001');  // Very low boost for pages
    }

    return {
      fq: `(${baseModels.join(' OR ')})`
    };
  }

  /**
   * Alternative method for generating boosted model queries to be used in the main query (q parameter)
   * This provides stronger boosting control than filter queries
   */
  static buildBoostedModelQuery(includePeriodicalItem: boolean = false, includePage: boolean = false): string {
    const baseModels = [
      'model:periodical^10',
      'model:monograph^8',
      'model:map^2',
      'model:graphic^2',
      'model:archive^2',
      'model:manuscript^2',
      'model:soundrecording^2',
      'model:sheetmusic^2',
      'model:convolute^2',
      '(model:collection AND collection.is_standalone:true)^2',
      'model:monographunit^2',
      'model:supplement^2',
      'model:article^2'
    ];

    if (includePeriodicalItem) {
      baseModels.push('model:periodicalitem^2');
      baseModels.push('model:periodicalvolume^2');
    }
    if (includePage) {
      baseModels.push('model:page^0.001');
    }

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

  static facetFields(fields: string[], minCount = 1): Record<string, any> {
    return {
      facet: 'true',
      'facet.mincount': `${minCount}`,
      'facet.field': fields
    };
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

    return input.replace(/([+\-!(){}\[\]^~:\\])/g, '\\$1');

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

}
