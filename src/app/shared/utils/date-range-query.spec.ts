import { buildDateOverlapQuery, normalizeDateRangeParams } from './date-range-query';

describe('normalizeDateRangeParams', () => {
  it('returns both bounds unchanged for a valid interval', () => {
    expect(normalizeDateRangeParams({ dateFrom: '1901-03-02', dateTo: '1901-03-05' }))
      .toEqual({ dateFrom: '1901-03-02', dateTo: '1901-03-05' });
  });

  it('swaps an inverted interval (from > to)', () => {
    expect(normalizeDateRangeParams({ dateFrom: '1902-02-03', dateTo: '1901-02-03' }))
      .toEqual({ dateFrom: '1901-02-03', dateTo: '1902-02-03' });
  });

  it('handles missing bounds', () => {
    expect(normalizeDateRangeParams({ dateFrom: '1901-03-02' }))
      .toEqual({ dateFrom: '1901-03-02', dateTo: null });
    expect(normalizeDateRangeParams({ dateTo: '1901-03-02' }))
      .toEqual({ dateFrom: null, dateTo: '1901-03-02' });
    expect(normalizeDateRangeParams({})).toEqual({ dateFrom: null, dateTo: null });
  });
});

describe('buildDateOverlapQuery', () => {
  it('returns null when no date params are present', () => {
    expect(buildDateOverlapQuery({})).toBeNull();
  });

  it('builds an overlap query for a closed interval', () => {
    expect(buildDateOverlapQuery({ dateFrom: '1901-03-02', dateTo: '1901-03-02' }))
      .toBe('(date.min:[* TO 1901-03-02T23:59:59Z] AND date.max:[1901-03-02T00:00:00Z TO *])');
  });

  it('matches a document spanning the interval (yearly volume vs single day)', () => {
    // volume 1901: date.min=1901-01-01, date.max=1901-12-31; filter 1901-03-02
    // must be expressed so that min <= to AND max >= from
    const q = buildDateOverlapQuery({ dateFrom: '1901-03-02', dateTo: '1901-03-02' })!;
    expect(q).toContain('date.min:[* TO 1901-03-02T23:59:59Z]');
    expect(q).toContain('date.max:[1901-03-02T00:00:00Z TO *]');
  });

  it('swaps an inverted interval before building the query', () => {
    expect(buildDateOverlapQuery({ dateFrom: '1902-02-03', dateTo: '1901-02-03' }))
      .toBe('(date.min:[* TO 1902-02-03T23:59:59Z] AND date.max:[1901-02-03T00:00:00Z TO *])');
  });

  it('builds open-ended queries for a single bound', () => {
    expect(buildDateOverlapQuery({ dateFrom: '1901-03-02' }))
      .toBe('(date.max:[1901-03-02T00:00:00Z TO *])');
    expect(buildDateOverlapQuery({ dateTo: '1901-03-02' }))
      .toBe('(date.min:[* TO 1901-03-02T23:59:59Z])');
  });
});
