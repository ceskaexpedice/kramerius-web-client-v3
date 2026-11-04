import { TestBed } from '@angular/core/testing';
import { ModsParserService } from './mods-parser.service';
import { Metadata } from '../models/metadata.model';

describe('ModsParserService.getModsOrAggregate', () => {
  let service: ModsParserService;
  let getMods: jasmine.Spy;
  const mods = new Metadata();

  beforeEach(() => {
    service = TestBed.inject(ModsParserService);
    getMods = spyOn(service, 'getMods');
  });

  it('uses the member library when it serves the MODS', async () => {
    getMods.and.returnValue(Promise.resolve(mods));
    expect(await service.getModsOrAggregate('uuid:x', 'full', 'nkp')).toBe(mods);
    expect(getMods).toHaveBeenCalledOnceWith('uuid:x', 'full', 'nkp');
  });

  it('falls back to the aggregated record when the library 404s', async () => {
    getMods.and.callFake((_u: string, _t: string, lib?: string) =>
      lib ? Promise.reject(new Error('404')) : Promise.resolve(mods));
    expect(await service.getModsOrAggregate('uuid:x', 'full', 'nkp')).toBe(mods);
    expect(getMods).toHaveBeenCalledWith('uuid:x', 'full');
  });

  it('rethrows without a library to fall back from', async () => {
    getMods.and.returnValue(Promise.reject(new Error('404')));
    await expectAsync(service.getModsOrAggregate('uuid:x')).toBeRejected();
    expect(getMods).toHaveBeenCalledTimes(1);
  });
});
