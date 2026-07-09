import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { RecordHandlerService } from './record-handler.service';
import { LibraryContextService } from './library-context.service';
import { SearchService } from './search.service';
import { AdminModeService } from './admin-mode.service';
import { BreakpointService } from './breakpoint.service';
import { UserService } from './user.service';
import { MatDialog } from '@angular/material/dialog';
import { DocumentTypeEnum } from '../../modules/constants/document-type';

describe('RecordHandlerService.getDocumentUrl fulltext forwarding', () => {
  let service: RecordHandlerService;

  beforeEach(() => {
    // Fake Router that renders the tree as a query-string URL we can assert on.
    const routerStub = {
      createUrlTree: (segments: any[], extras?: { queryParams?: Record<string, string> }) => ({
        toString: () => {
          const path = '/' + segments.join('/');
          const qp = extras?.queryParams
            ? '?' + Object.entries(extras.queryParams)
                .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
                .join('&')
            : '';
          return path + qp;
        },
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        RecordHandlerService,
        { provide: Router, useValue: routerStub },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParams: {} } } },
        { provide: LibraryContextService, useValue: { prependLibraryPrefix: (s: any[]) => s } },
        { provide: SearchService, useValue: {} },
        { provide: AdminModeService, useValue: {} },
        { provide: BreakpointService, useValue: {} },
        { provide: UserService, useValue: {} },
        { provide: MatDialog, useValue: {} },
      ],
    });
    service = TestBed.inject(RecordHandlerService);
  });

  it('omits ?fulltext for a periodical matched on title/metadata (non-grouped)', () => {
    // The global query is stamped onto every result as `fulltext`, but a plain
    // title match is not a within-pages hit, so it must not restore an
    // in-document search.
    const url = service.getDocumentUrl({
      model: DocumentTypeEnum.periodical,
      pid: 'uuid:root',
      fulltext: 'chochola',
    });
    expect(url).not.toContain('fulltext=');
  });

  it('carries ?fulltext for a grouped page representative (within-pages hit)', () => {
    const url = service.getDocumentUrl({
      model: DocumentTypeEnum.periodical,
      pid: 'uuid:root',
      fulltext: 'chochola',
      grouped: true,
    });
    expect(url).toContain('fulltext=chochola');
  });

  it('carries ?fulltext for an explicit document-level override regardless of grouping', () => {
    const url = service.getDocumentUrl({
      model: DocumentTypeEnum.periodical,
      pid: 'uuid:root',
      fulltextForDocument: 'chochola',
    });
    expect(url).toContain('fulltext=chochola');
  });
});
