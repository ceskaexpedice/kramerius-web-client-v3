import { formatIssueDateLabel, parseIssueDateStr, parseIssueStartDate } from './periodical-date';

describe('periodical-date', () => {

  describe('parseIssueDateStr', () => {

    it('parses a plain DD.MM.YYYY date', () => {
      expect(parseIssueDateStr('12.05.1986')).toEqual(new Date(1986, 4, 12));
    });

    it('parses a day-only range start, inheriting month and year from the end', () => {
      // 03.-09.01.1986 -> 3. 1. 1986
      expect(parseIssueDateStr('03.-09.01.1986')).toEqual(new Date(1986, 0, 3));
    });

    it('parses a day+month range start, inheriting the year from the end', () => {
      // 31.01. –01.02.1998 -> 31. 1. 1998
      expect(parseIssueDateStr('31.01. –01.02.1998')).toEqual(new Date(1998, 0, 31));
    });

    it('parses a fully qualified range spanning the new year', () => {
      // 31.12.1998–01.01.1999 -> 31. 12. 1998
      expect(parseIssueDateStr('31.12.1998–01.01.1999')).toEqual(new Date(1998, 11, 31));
    });

    it('parses a day-only range start written with a plain hyphen and spaces', () => {
      // 02. –03.02.1998 -> 2. 2. 1998
      expect(parseIssueDateStr('02. –03.02.1998')).toEqual(new Date(1998, 1, 2));
    });

    it('accepts an em dash as the range separator', () => {
      expect(parseIssueDateStr('03.—09.01.1986')).toEqual(new Date(1986, 0, 3));
    });

    it('returns null for empty or unparsable input', () => {
      expect(parseIssueDateStr('')).toBeNull();
      expect(parseIssueDateStr(undefined)).toBeNull();
      expect(parseIssueDateStr(null)).toBeNull();
      expect(parseIssueDateStr('1986')).toBeNull();
      expect(parseIssueDateStr('bez data')).toBeNull();
    });

    it('rejects out-of-range day and month values', () => {
      expect(parseIssueDateStr('32.01.1986')).toBeNull();
      expect(parseIssueDateStr('01.13.1986')).toBeNull();
    });

  });

  describe('parseIssueStartDate', () => {

    it('prefers the structured SOLR range start fields', () => {
      const date = parseIssueStartDate({
        'date.str': '03.-09.01.1986',
        'date_range_start.day': 3,
        'date_range_start.month': 1,
        'date_range_start.year': 1986,
        'date_range_end.day': 9,
        'date_range_end.month': 1,
        'date_range_end.year': 1986,
      });
      expect(date).toEqual(new Date(1986, 0, 3));
    });

    it('accepts range start fields delivered as strings', () => {
      const date = parseIssueStartDate({
        'date_range_start.day': '3',
        'date_range_start.month': '1',
        'date_range_start.year': '1986',
      });
      expect(date).toEqual(new Date(1986, 0, 3));
    });

    it('falls back to date.str when the range start fields are missing', () => {
      const date = parseIssueStartDate({
        'date.str': '03.-09.01.1986',
        'date_range_end.day': 9,
        'date_range_end.month': 1,
        'date_range_end.year': 1986,
      });
      expect(date).toEqual(new Date(1986, 0, 3));
    });

    it('never falls back to the range END, which would misplace the issue', () => {
      const date = parseIssueStartDate({
        'date_range_end.day': 9,
        'date_range_end.month': 1,
        'date_range_end.year': 1986,
      });
      expect(date).toBeNull();
    });

    it('returns null for missing input', () => {
      expect(parseIssueStartDate(undefined)).toBeNull();
      expect(parseIssueStartDate(null)).toBeNull();
      expect(parseIssueStartDate({})).toBeNull();
    });

  });

  describe('formatIssueDateLabel', () => {

    it('labels a range issue with its first day', () => {
      expect(formatIssueDateLabel({
        'date.str': '03.-09.01.1986',
        'date_range_start.day': 3,
        'date_range_start.month': 1,
        'date_range_start.year': 1986,
      })).toBe('3.1.');
    });

    it('labels a single-day issue with that day', () => {
      expect(formatIssueDateLabel({ 'date.str': '12.05.1986' })).toBe('12.5.');
    });

    it('falls back to the raw date.str when no date can be derived', () => {
      expect(formatIssueDateLabel({ 'date.str': 'nedatovano' })).toBe('nedatovano');
    });

    it('returns an empty string when there is nothing to show', () => {
      expect(formatIssueDateLabel({})).toBe('');
      expect(formatIssueDateLabel(undefined)).toBe('');
    });

  });


  // Regression: the year is what the date-navigator feeds to the calendar popup
  // as its @Input() year. Naively taking date.str.split('.')[2] yields "01" for
  // a range, which parsed to year 1 and left the popup on an unrelated year.
  describe('year extraction for the calendar popup', () => {

    it('yields the range start year, not a month fragment', () => {
      expect(parseIssueDateStr('03.-09.01.1986')!.getFullYear()).toBe(1986);
      expect(parseIssueDateStr('31.01. –01.02.1998')!.getFullYear()).toBe(1998);
      expect(parseIssueDateStr('02. –03.02.1998')!.getFullYear()).toBe(1998);
    });

    it('yields the START year for a range spanning the new year', () => {
      expect(parseIssueDateStr('31.12.1998–01.01.1999')!.getFullYear()).toBe(1998);
    });

    it('still yields the year for a plain date', () => {
      expect(parseIssueDateStr('12.05.1986')!.getFullYear()).toBe(1986);
    });

  });
});
