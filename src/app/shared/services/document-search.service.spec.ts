import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { DocumentSearchService } from './document-search.service';
import { AltoService } from './alto.service';
import { IIIFViewerService } from './iiif-viewer.service';
import { SolrService } from '../../core/solr/solr.service';
import { CdkSourceService } from './cdk-source.service';
import { DetailViewService } from '../../modules/detail-view-page/services/detail-view.service';

describe('DocumentSearchService OCR fallback', () => {
  let service: DocumentSearchService;
  let alto: jasmine.SpyObj<AltoService>;
  let detailView: jasmine.SpyObj<DetailViewService>;

  const notFound = () => throwError(() => ({ status: 404 }));
  const highlight = (pid: string) => (service as any).fetchAndDisplayHighlights(pid, 'semelka');

  beforeEach(() => {
    alto = jasmine.createSpyObj<AltoService>('AltoService', ['fetchAltoXml', 'fetchOcrText']);
    detailView = jasmine.createSpyObj<DetailViewService>('DetailViewService', ['isPageLocked', 'setFulltextParam']);
    detailView.isPageLocked.and.returnValue(false);

    TestBed.configureTestingModule({
      providers: [
        DocumentSearchService,
        { provide: AltoService, useValue: alto },
        { provide: DetailViewService, useValue: detailView },
        { provide: IIIFViewerService, useValue: jasmine.createSpyObj('IIIFViewerService', ['setSearchQuery', 'clearSearch', 'displaySearchHighlights']) },
        { provide: SolrService, useValue: {} },
        { provide: CdkSourceService, useValue: { getCode: () => null } },
        { provide: ActivatedRoute, useValue: {} },
      ]
    });
    service = TestBed.inject(DocumentSearchService);
  });

  it('offers the OCR text when the page has no ALTO but has text', () => {
    alto.fetchAltoXml.and.returnValue(notFound());
    const ocr = new Subject<string>();
    alto.fetchOcrText.and.returnValue(ocr);

    highlight('uuid:p1');
    ocr.next('Jan Semelka, 28. zppl.');

    expect(service.altoUnavailable()).toBeTrue();
    expect(service.ocrFallbackPid()).toBe('uuid:p1');
  });

  it('offers nothing when the OCR text is empty or missing', () => {
    alto.fetchAltoXml.and.returnValue(notFound());
    alto.fetchOcrText.and.returnValue(notFound());

    highlight('uuid:p1');

    expect(service.altoUnavailable()).toBeTrue();
    expect(service.ocrFallbackPid()).toBeNull();
  });

  it('does not look for OCR when ALTO is only forbidden', () => {
    alto.fetchAltoXml.and.returnValue(throwError(() => ({ status: 403 })));

    highlight('uuid:p1');

    expect(alto.fetchOcrText).not.toHaveBeenCalled();
    expect(service.ocrFallbackPid()).toBeNull();
  });

  it('ignores a late OCR answer for a page the reader already left', () => {
    alto.fetchAltoXml.and.returnValue(notFound());
    const firstOcr = new Subject<string>();
    const secondOcr = new Subject<string>();
    alto.fetchOcrText.and.returnValues(firstOcr, secondOcr);

    highlight('uuid:p1');
    highlight('uuid:p2');
    firstOcr.next('text of page one');

    expect(service.ocrFallbackPid()).toBeNull();

    secondOcr.next('text of page two');
    expect(service.ocrFallbackPid()).toBe('uuid:p2');
  });

  it('clears the offer with the search', () => {
    alto.fetchAltoXml.and.returnValue(notFound());
    const ocr = new Subject<string>();
    alto.fetchOcrText.and.returnValue(ocr);
    highlight('uuid:p1');
    ocr.next('text');

    service.clearSearch();

    expect(service.ocrFallbackPid()).toBeNull();
  });
});

describe('DocumentSearchService restore from URL', () => {
  let service: DocumentSearchService;
  let detailView: any;
  let queryParams: Record<string, string>;
  // Solr returns hits by relevance, not in page order.
  const hits = [{ pid: 'p45', highlightedText: 'b' }, { pid: 'p43', highlightedText: 'a' }];

  beforeEach(() => {
    queryParams = { fulltext: '21. prosince 1918' };
    detailView = {
      pages: [{ pid: 'p1' }, { pid: 'p43' }, { pid: 'p45' }],
      currentPagePid: 'p1',
      isPdf: false,
      navigateToPage: jasmine.createSpy('navigateToPage'),
    };

    TestBed.configureTestingModule({
      providers: [
        DocumentSearchService,
        { provide: AltoService, useValue: jasmine.createSpyObj('AltoService', ['fetchAltoXml', 'fetchOcrText']) },
        { provide: DetailViewService, useValue: detailView },
        { provide: IIIFViewerService, useValue: {
          setSearchQuery: () => {},
          imageLoaded$: new Subject<void>(),
          nextPageFullyLoaded$: () => new Subject<void>(),
        } },
        { provide: SolrService, useValue: { getInDocumentSearchResults: () => of(hits) } },
        { provide: CdkSourceService, useValue: { getCode: () => null } },
        { provide: ActivatedRoute, useValue: { snapshot: { get queryParams() { return queryParams; } } } },
      ]
    });
    service = TestBed.inject(DocumentSearchService);
  });

  it('jumps to the first match in page order when the current page has none', () => {
    service.restoreSearchFromUrl('book');
    expect(detailView.navigateToPage).toHaveBeenCalledWith('p43');
  });

  it('stays on the current page when it has a match', () => {
    detailView.currentPagePid = 'p45';
    service.restoreSearchFromUrl('book');
    expect(detailView.navigateToPage).not.toHaveBeenCalled();
  });

  it('orders the hits by page, like the sidebar', () => {
    let pids: string[] = [];
    service.searchResults$.subscribe(r => pids = r.map(x => x.pid));
    service.restoreSearchFromUrl('book');
    expect(pids).toEqual(['p43', 'p45']);
  });

  it('keeps the article page', () => {
    queryParams = { ...queryParams, article: 'art' };
    service.restoreSearchFromUrl('book');
    expect(detailView.navigateToPage).not.toHaveBeenCalled();
  });
});
