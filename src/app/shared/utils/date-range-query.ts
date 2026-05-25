import { Params } from '@angular/router';

export function buildYearRangeQuery(params: Params): string | null {
  const yearFrom = params['yearFrom'];
  const yearTo = params['yearTo'];
  if (yearFrom === undefined && yearTo === undefined) return null;

  const from = yearFrom ? parseInt(yearFrom, 10) : 0;
  const to = yearTo ? parseInt(yearTo, 10) : new Date().getFullYear();
  return `(date_range_start.year:[${from} TO ${to}] OR date_range_end.year:[${from} TO ${to}])`;
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
