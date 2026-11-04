import { CdkSourceService } from './cdk-source.service';

describe('CdkSourceService per-root memory', () => {
  let service: CdkSourceService;

  beforeEach(() => {
    service = new CdkSourceService();
  });

  it('returns the source picked for the same root (another issue of the title)', () => {
    service.rememberForRoot('uuid:periodical', 'mzk');
    expect(service.rememberedForRoot('uuid:periodical')).toBe('mzk');
  });

  it('keeps titles apart', () => {
    service.rememberForRoot('uuid:a', 'mzk');
    expect(service.rememberedForRoot('uuid:b')).toBeNull();
  });

  it('forgets the choice when it is cleared ("All sources")', () => {
    service.rememberForRoot('uuid:a', 'mzk');
    service.rememberForRoot('uuid:a', null);
    expect(service.rememberedForRoot('uuid:a')).toBeNull();
  });

  it('ignores a missing root pid', () => {
    service.rememberForRoot(null, 'mzk');
    expect(service.rememberedForRoot(null)).toBeNull();
  });
});
