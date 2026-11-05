import { alternativeSources, fallbackNoticeText } from './iiif-fallback-notice';

describe('IIIF fallback notice', () => {

  const names: Record<string, string> = { nkp: 'Národní knihovna ČR', mzk: 'Moravská zemská knihovna v Brně', knav: 'Knihovna AV ČR' };
  const libraryName = (code: string) => names[code] ?? code;

  describe('alternativeSources', () => {
    it('lists the other member libraries, keeping the document order', () => {
      expect(alternativeSources(['mzk', 'nkp', 'knav'], 'nkp')).toEqual(['mzk', 'knav']);
    });

    it('is empty when the document has only the current library', () => {
      expect(alternativeSources(['nkp'], 'nkp')).toEqual([]);
    });

    it('is empty without a selected library (not CDK)', () => {
      expect(alternativeSources(['mzk', 'nkp'], null)).toEqual([]);
    });

    it('tolerates missing collections', () => {
      expect(alternativeSources(undefined, 'nkp')).toEqual([]);
      expect(alternativeSources(null, 'nkp')).toEqual([]);
    });
  });

  describe('fallbackNoticeText', () => {
    it('names the failing library when the image is unavailable', () => {
      const text = fallbackNoticeText('unavailable', 'nkp', [], libraryName);
      expect(text.titleKey).toBe('iiif-fallback--unavailable-title-library');
      expect(text.titleParams).toEqual({ library: 'Národní knihovna ČR' });
      expect(text.messageKey).toBe('iiif-fallback--message');
    });

    it('uses the generic title when no library is selected', () => {
      const text = fallbackNoticeText('unavailable', null, [], libraryName);
      expect(text.titleKey).toBe('iiif-fallback--unavailable-title');
      expect(text.titleParams).toEqual({});
    });

    it('says access is denied rather than broken for a 403', () => {
      const text = fallbackNoticeText('forbidden', 'nkp', [], libraryName);
      expect(text.titleKey).toBe('iiif-fallback--forbidden-title');
    });

    it('points to the other libraries generically, without listing them', () => {
      const text = fallbackNoticeText('unavailable', 'nkp', ['mzk', 'knav'], libraryName);
      expect(text.messageKey).toBe('iiif-fallback--message-other-sources');
      expect(text.messageParams).toEqual({});
    });

    it('points to the other libraries for a 403 too - another copy may carry a different licence', () => {
      const text = fallbackNoticeText('forbidden', 'nkp', ['mzk'], libraryName);
      expect(text.messageKey).toBe('iiif-fallback--message-other-sources');
    });
  });
});
