import { TestBed } from '@angular/core/testing';
import { ShareService } from './share.service';
import { CdkSourceService } from './cdk-source.service';
import { EnvironmentService } from './environment.service';
import { LibraryContextService } from './library-context.service';

/**
 * Regression tests for issue #187: a shared crop (`?bb=`) opened on the wrong
 * CDK member library. Page pids belong to one library's copy, so a link
 * without `?source=` landed on the leader library — page 1, preview fallback,
 * no crop.
 */
describe('ShareService.getCurrentUrl', () => {
  let service: ShareService;
  let cdkSource: CdkSourceService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CdkSourceService,
        { provide: EnvironmentService, useValue: { isLibrarySwitchEnabled: () => false } },
        { provide: LibraryContextService, useValue: { getLibraryPrefix: () => '' } },
      ],
    });
    service = TestBed.inject(ShareService);
    cdkSource = TestBed.inject(CdkSourceService);
  });

  it('carries the selected CDK source library', () => {
    cdkSource.setCode('mzk');
    const url = new URL(service.getCurrentUrl('uuid:page-1'));
    expect(url.pathname).toBe('/uuid/uuid:page-1');
    expect(url.searchParams.get('source')).toBe('mzk');
  });

  it('adds no source when none is selected (non-CDK)', () => {
    cdkSource.setCode(null);
    const url = new URL(service.getCurrentUrl('uuid:page-1'));
    expect(url.searchParams.has('source')).toBeFalse();
  });
});
