import { TestBed } from '@angular/core/testing';
import { Location, Metadata, mergeMetadata } from '../models/metadata.model';
import { ModsParserService } from '../services/mods-parser.service';
import { EnvironmentService } from '../services/environment.service';
import { groupLocationsByInstitution } from './group-locations';

function loc(physicalLocation: string, shelfLocator: string): Location {
  return Object.assign(new Location(), { physicalLocation, shelfLocator });
}

describe('groupLocationsByInstitution', () => {
  it('names an institution once and joins its shelf locators', () => {
    const grouped = groupLocationsByInstitution([
      loc('ABG001', 'F 3937/1966, F 3937/1967'),
      loc('ABG001', 'F 3937/1980'),
      loc('BOA001', 'PE 265'),
      loc('ABG001', 'F 3937/1989-1'),
    ]);

    expect(grouped.map(l => [l.physicalLocation, l.shelfLocator])).toEqual([
      ['ABG001', 'F 3937/1966, F 3937/1967, F 3937/1980, F 3937/1989-1'],
      ['BOA001', 'PE 265'],
    ]);
  });

  it('keeps locations without an institution as separate rows', () => {
    const grouped = groupLocationsByInstitution([loc('', 'A 1'), loc('', 'A 2')]);
    expect(grouped.map(l => l.shelfLocator)).toEqual(['A 1', 'A 2']);
  });

  it('drops a repeated locator and does not mutate its input', () => {
    const first = loc('ABG001', 'F 1');
    const grouped = groupLocationsByInstitution([first, loc('ABG001', 'F 1'), loc('ABG001', 'F 2')]);

    expect(grouped[0].shelfLocator).toBe('F 1, F 2');
    expect(first.shelfLocator).toBe('F 1');
  });
});

/**
 * MKP periodical uuid:96009ac0-01b3-11df-8c81-0030487be43a: one <location> with
 * the institution and three <shelfLocator>s, which Solr indexes as three
 * separate `shelf_locators`. The parser used to keep only the first locator, so
 * merging gave the institution to one Solr row and left two without a source.
 */
describe('MODS locations with several shelf locators', () => {
  const MODS = `<mods:modsCollection xmlns:mods="http://www.loc.gov/mods/v3"><mods:mods version="3.4">
    <mods:location>
      <mods:physicalLocation>ABG001</mods:physicalLocation>
      <mods:shelfLocator>F 3937/1966</mods:shelfLocator>
      <mods:shelfLocator>F 3937/1980</mods:shelfLocator>
      <mods:shelfLocator>F 3937/1989-1</mods:shelfLocator>
    </mods:location>
  </mods:mods></mods:modsCollection>`;

  let parser: ModsParserService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: EnvironmentService, useValue: { getApiUrl: () => '' } }]
    });
    parser = TestBed.inject(ModsParserService);
  });

  it('gives every shelf locator its institution', async () => {
    const mods: Metadata = await (parser as any).parseMods(MODS, 'uuid:x', 'full');

    expect(mods.locations.map(l => [l.physicalLocation, l.shelfLocator])).toEqual([
      ['ABG001', 'F 3937/1966'],
      ['ABG001', 'F 3937/1980'],
      ['ABG001', 'F 3937/1989-1'],
    ]);
  });

  it('leaves no Solr locator without a source after merging, and groups to one row', async () => {
    const mods: Metadata = await (parser as any).parseMods(MODS, 'uuid:x', 'full');
    const solr = new Metadata();
    solr.locations = ['F 3937/1966', 'F 3937/1980', 'F 3937/1989-1'].map(s => loc('', s));

    const merged = mergeMetadata(solr, mods);

    expect(merged.locations.every(l => l.physicalLocation === 'ABG001')).toBeTrue();
    expect(groupLocationsByInstitution(merged.locations).length).toBe(1);
  });

  it('still records an institution listed without a shelf locator', async () => {
    const xml = MODS.replace(/<mods:shelfLocator>[^<]*<\/mods:shelfLocator>/g, '');
    const mods: Metadata = await (parser as any).parseMods(xml, 'uuid:x', 'full');

    expect(mods.locations.map(l => [l.physicalLocation, l.shelfLocator])).toEqual([['ABG001', '']]);
  });
});
