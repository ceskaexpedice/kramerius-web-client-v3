import { Metadata, Publisher, TitleInfo } from '../../models/metadata.model';
import { buildMonographUnitChildData, hasMonographUnitChildContent, monographUnitHeading } from './monograph-unit-child';

/**
 * Issue #190: a volume of a multivolume monograph showed neither the place
 * nor the year of publication. The panel's primary data is the multivolume
 * title's MODS ("L. Mazáč" only); the volume's own imprint ("V Praze :
 * L. Mazáč, 1936") lives on the volume card, which also named the volume by
 * the repeated multivolume title instead of its part.
 */
describe('monograph unit child card (#190)', () => {

  function title(fields: Partial<TitleInfo>): TitleInfo {
    return Object.assign(new TitleInfo(), fields);
  }

  function publisher(name: string, place: string, date: string | null): Publisher {
    return Object.assign(new Publisher(), { name, place, date });
  }

  describe('monographUnitHeading', () => {
    it('joins part number and part name', () => {
      expect(monographUnitHeading([
        title({ title: 'Dějiny národu českého v Čechách a v Moravě', partNumber: '1', partName: 'Od prvověkosti až do roku 1253' }),
      ])).toBe('1. Od prvověkosti až do roku 1253');
    });

    it('does not double a trailing dot of the part number', () => {
      expect(monographUnitHeading([title({ title: 'X', partNumber: '2.', partName: 'Díl' })])).toBe('2. Díl');
    });

    it('prefers the primary titleInfo over a uniform one listed first', () => {
      expect(monographUnitHeading([
        title({ title: 'Uniform', type: 'uniform' }),
        title({ title: 'X', partNumber: '3' }),
      ])).toBe('3');
    });

    it('uses the part name alone when there is no number', () => {
      expect(monographUnitHeading([title({ title: 'X', partName: 'Rejstřík' })])).toBe('Rejstřík');
    });

    it('falls back to the title when the MODS names no part', () => {
      expect(monographUnitHeading([title({ title: 'Svazek bez čísla' })])).toBe('Svazek bez čísla');
    });

    it('is empty without titles', () => {
      expect(monographUnitHeading([])).toBe('');
      expect(monographUnitHeading(undefined)).toBe('');
    });
  });

  describe('buildMonographUnitChildData', () => {
    it('keeps the MODS imprint and does not repeat its year as a separate date', () => {
      const mods = new Metadata();
      mods.publishers = [publisher('L. Mazáč', 'V Praze', '1936')];

      const child = buildMonographUnitChildData(mods, '1936');

      expect(child.publishers[0].fullDetail()).toContain('V Praze');
      expect(child.publishers[0].fullDetail()).toContain('1936');
      expect(child.dateStr).toBe('');
    });

    it('takes the year from Solr when the MODS imprint has none', () => {
      const mods = new Metadata();
      mods.publishers = [publisher('L. Mazáč', 'V Praze', null)];

      expect(buildMonographUnitChildData(mods, '1936').dateStr).toBe('1936');
    });

    it('takes the year from Solr when there is no imprint at all', () => {
      expect(buildMonographUnitChildData(new Metadata(), '1937').dateStr).toBe('1937');
    });

    it('leaves the cached MODS object untouched and keeps its methods', () => {
      const mods = new Metadata();
      const child = buildMonographUnitChildData(mods, '1936');

      expect(mods.dateStr).toBe('');
      expect(child).not.toBe(mods);
      expect(child instanceof Metadata).toBeTrue();
    });
  });

  describe('hasMonographUnitChildContent', () => {
    it('is true for a card with only an imprint', () => {
      const mods = new Metadata();
      mods.publishers = [publisher('L. Mazáč', 'V Praze', '1936')];
      expect(hasMonographUnitChildContent(mods)).toBeTrue();
    });

    it('is false for an empty MODS', () => {
      expect(hasMonographUnitChildContent(new Metadata())).toBeFalse();
    });
  });
});
