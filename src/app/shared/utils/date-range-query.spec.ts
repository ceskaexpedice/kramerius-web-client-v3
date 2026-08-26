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

  // Month windows are how the periodical calendar loads its issues; a
  // multi-day issue must show up in EVERY month its range touches (issue #166).
  describe('month windows for the periodical calendar', () => {
    const monthQuery = (year: number, month: number, lastDay: number) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      return buildDateOverlapQuery({
        dateFrom: `${year}-${pad(month)}-01`,
        dateTo: `${year}-${pad(month)}-${pad(lastDay)}`,
      })!;
    };

    it('matches an issue whose range starts in the previous month', () => {
      // 31.12.1998-01.01.1999 has date.min in December, yet January must show it.
      const january = monthQuery(1999, 1, 31);
      expect(january).toBe('(date.min:[* TO 1999-01-31T23:59:59Z] AND date.max:[1999-01-01T00:00:00Z TO *])');
      // date.min (1998-12-31) <= 1999-01-31 and date.max (1999-01-01) >= 1999-01-01
    });

    it('matches the same issue from the month it starts in', () => {
      const december = monthQuery(1998, 12, 31);
      expect(december).toBe('(date.min:[* TO 1998-12-31T23:59:59Z] AND date.max:[1998-12-01T00:00:00Z TO *])');
    });

    it('builds a correct window for a leap February', () => {
      expect(monthQuery(2024, 2, 29))
        .toBe('(date.min:[* TO 2024-02-29T23:59:59Z] AND date.max:[2024-02-01T00:00:00Z TO *])');
    });
  });
});
