import { Params } from '@angular/router';

export function buildYearRangeQuery(params: Params): string | null {
  const yearFrom = params['yearFrom'];
  const yearTo = params['yearTo'];
  if (yearFrom === undefined && yearTo === undefined) return null;

  const from = yearFrom ? parseInt(yearFrom, 10) : 0;
  const to = yearTo ? parseInt(yearTo, 10) : new Date().getFullYear();
  return `(date_range_start.year:[${from} TO ${to}] OR date_range_end.year:[${from} TO ${to}])`;
}

/**
 * Reads dateFrom/dateTo (YYYY-MM-DD) from query params and normalizes an
 * inverted interval (from > to) by swapping the bounds, so a hand-edited URL
 * like dateFrom=1902-02-03&dateTo=1901-02-03 still yields a meaningful range.
 */
export function normalizeDateRangeParams(params: Params): { dateFrom: string | null; dateTo: string | null } {
  let dateFrom: string | null = params['dateFrom'] || null;
  let dateTo: string | null = params['dateTo'] || null;
  if (dateFrom && dateTo && dateFrom > dateTo) {
    [dateFrom, dateTo] = [dateTo, dateFrom];
  }
  return { dateFrom, dateTo };
}

/**
 * Interval-overlap date filter: matches documents whose own date range
 * [date.min, date.max] intersects [dateFrom, dateTo]. Unlike a start-date
 * filter this also matches documents spanning the interval — e.g. a yearly
 * periodical volume (1901-01-01..1901-12-31) matches dateFrom=1901-03-02.
 */
export function buildDateOverlapQuery(params: Params): string | null {
  const { dateFrom, dateTo } = normalizeDateRangeParams(params);
  if (!dateFrom && !dateTo) return null;

  if (dateFrom && dateTo) {
    return `(date.min:[* TO ${dateTo}T23:59:59Z] AND date.max:[${dateFrom}T00:00:00Z TO *])`;
  }
  if (dateFrom) {
    return `(date.max:[${dateFrom}T00:00:00Z TO *])`;
  }
  return `(date.min:[* TO ${dateTo}T23:59:59Z])`;
}

export function buildDateMinRangeQuery(params: Params): string | null {
  const dateFrom = params['dateFrom'];
  const dateTo = params['dateTo'];
  if (!dateFrom && !dateTo) return null;

  if (dateFrom && dateTo) {
    return `(date.min:[${dateFrom}T00:00:00Z TO ${dateTo}T23:59:59Z])`;
  }
  if (dateFrom) {
    return `(date.min:[${dateFrom}T00:00:00Z TO *])`;
  }
  return `(date.min:[* TO ${dateTo}T23:59:59Z])`;
}

export function appendToAdvancedQuery(advancedQuery: string | undefined, clause: string | null): string | undefined {
  if (!clause) return advancedQuery;
  return advancedQuery && advancedQuery.length > 0 ? `${advancedQuery} AND ${clause}` : clause;
}
