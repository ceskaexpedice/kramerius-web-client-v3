import { TestBed } from '@angular/core/testing';
import { ChangeDetectorRef, ElementRef } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MetadataDialogComponent } from './metadata-dialog.component';
import { ConfigService } from '../../../core/config/config.service';
import { KrameriusApiService } from '../../services/kramerius-api.service';
import { LocalStorageService } from '../../services/local-storage.service';
import { IIIFViewerService } from '../../services/iiif-viewer.service';
import { TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { DetailViewService } from '../../../modules/detail-view-page/services/detail-view.service';

/**
 * Guards the parts of the metadata dialog that `metadata: true` does NOT cover:
 * the raw-resource tabs behind it. ALTO/OCR serve the page's OCR text and IIIF is
 * the route to the full-resolution scan, so hiding a tab is not enough — the
 * fetch and the "URL" button have to refuse too, since a stale localStorage tab
 * reaches both without going through the tab strip.
 *
 * This spec importing the component at all is also what the record-handler
 * import cycle used to break (see `dialogSizing` there).
 */
describe('MetadataDialogComponent license gating', () => {
  function setup(opts: { deny?: string[]; lastTab?: string } = {}) {
    const deny = opts.deny ?? [];
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { document: { licences: ['dnnto'], mainTitle: 'T' } } },
        {
          provide: ConfigService,
          useValue: { isLicenseActionAllowed: (_l: string[], a: string) => !deny.includes(a) },
        },
        { provide: KrameriusApiService, useValue: { getMetadataUrl: () => 'https://api/x' } },
        { provide: LocalStorageService, useValue: { get: () => opts.lastTab ?? null, set: () => {} } },
        { provide: IIIFViewerService, useValue: { getIIIFInfoUrl: () => 'https://api/iiif/info.json' } },
        { provide: TranslateService, useValue: { instant: (k: string) => k } },
        { provide: HttpClient, useValue: { get: () => ({ subscribe: () => {} }) } },
        // Built directly rather than via TestBed.createComponent so no template
        // renders — this is about the gating logic. Both refs therefore need
        // stubbing, as neither exists outside a real component instantiation.
        { provide: ChangeDetectorRef, useValue: { detectChanges: () => {} } },
        { provide: ElementRef, useValue: { nativeElement: document.createElement('div') } },
      ],
    });
    return TestBed.runInInjectionContext(() => new MetadataDialogComponent());
  }

  it('does not restore a remembered tab the license now forbids', () => {
    // Viewing ALTO on a public document must not land a DNNTO document there.
    const c = setup({ deny: ['text'], lastTab: 'alto' });
    c.ngOnInit();
    expect(c.activeTabLabel).not.toBe('alto');
    expect(c.visibleTabs).toContain(c.activeTabLabel);
  });

  it('restores a remembered tab that is still allowed', () => {
    const c = setup({ lastTab: 'alto' });
    c.ngOnInit();
    expect(c.activeTabLabel).toBe('alto');
  });

  it('refuses to open the raw URL of a forbidden tab', () => {
    const spy = spyOn(window, 'open');
    const c = setup({ deny: ['text'] });
    c.selectedPid = 'uuid:1';
    // Force the blocked tab past the UI, as a stale localStorage value would.
    c.activeTabLabel = 'alto';

    c.openUrl();

    expect(spy).not.toHaveBeenCalled();
  });

  it('still opens the raw URL of an allowed tab', () => {
    const spy = spyOn(window, 'open');
    const c = setup();
    c.selectedPid = 'uuid:1';
    c.activeTabLabel = 'mods';

    c.openUrl();

    expect(spy).toHaveBeenCalled();
  });

  it('does not fetch a forbidden tab', () => {
    const c = setup({ deny: ['text'] });
    const api = TestBed.inject(KrameriusApiService) as any;
    api.getAlto = jasmine.createSpy('getAlto');
    c.selectedPid = 'uuid:1';
    c.activeTabLabel = 'alto';

    c.loadData();

    expect(api.getAlto).not.toHaveBeenCalled();
  });
});

/**
 * The page/document scope split, the same one the export panel draws (commit
 * ef9f1201). `Metadata.licences` is Solr's `licenses.facet` — the union of the
 * whole tree — so on a `dnnto` periodical it denies `text` for every tab, even
 * when the backend is serving the open page as public. At page scope the dialog
 * defers to `DetailViewService.isActionAllowed`, which reads the runtime
 * `providedByLicenses`, so the OCR tab and the viewer's page-text button can no
 * longer disagree about the same page.
 */
describe('MetadataDialogComponent tab scope', () => {
  function setup(opts: {
    staticDeny?: string[];
    runtimeAllows?: boolean;
    viewerPagePid?: string | null;
    withDetailView?: boolean;
  } = {}) {
    const staticDeny = opts.staticDeny ?? [];
    const withDetailView = opts.withDetailView ?? true;

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { document: { licences: ['dnnto'], mainTitle: 'T' } } },
        {
          provide: ConfigService,
          useValue: { isLicenseActionAllowed: (_l: string[], a: string) => !staticDeny.includes(a) },
        },
        { provide: KrameriusApiService, useValue: { getMetadataUrl: () => 'https://api/x' } },
        { provide: LocalStorageService, useValue: { get: () => null, set: () => {} } },
        { provide: IIIFViewerService, useValue: { getIIIFInfoUrl: () => 'https://api/iiif/info.json' } },
        { provide: TranslateService, useValue: { instant: (k: string) => k } },
        { provide: HttpClient, useValue: { get: () => ({ subscribe: () => {} }) } },
        { provide: ChangeDetectorRef, useValue: { detectChanges: () => {} } },
        { provide: ElementRef, useValue: { nativeElement: document.createElement('div') } },
        {
          provide: DetailViewService,
          useValue: withDetailView ? {
            isActionAllowed: () => opts.runtimeAllows ?? true,
            currentPagePid: opts.viewerPagePid ?? 'uuid:page-1',
          } : null,
        },
      ],
    });
    return TestBed.runInInjectionContext(() => new MetadataDialogComponent());
  }

  it('shows the OCR tabs on a page the backend serves permissively, despite the document flags', () => {
    const c = setup({ staticDeny: ['text', 'jpeg'], runtimeAllows: true });
    c.selectedModel = 'page';
    c.selectedPid = 'uuid:page-1';

    expect(c.visibleTabs).toContain('ocr');
    expect(c.visibleTabs).toContain('alto');
  });

  it('keeps the OCR tabs hidden when the runtime licence also denies text', () => {
    const c = setup({ staticDeny: ['text'], runtimeAllows: false });
    c.selectedModel = 'page';
    c.selectedPid = 'uuid:page-1';

    expect(c.visibleTabs).not.toContain('ocr');
    expect(c.visibleTabs).not.toContain('alto');
  });

  it('does not let a permissive page speak for a selected ancestor', () => {
    // The reader switched the hierarchy selector to the issue: its children and
    // foxml reach pages that were never opened.
    const c = setup({ staticDeny: ['text'], runtimeAllows: true });
    c.selectedModel = 'periodicalitem';
    c.selectedPid = 'uuid:issue-1';

    expect(c.visibleTabs).not.toContain('ocr');
    expect(c.visibleTabs).not.toContain('foxml');
  });

  it('does not let a permissive open page speak for a different page', () => {
    // Page scope, but the selected pid is not the one the viewer has open.
    const c = setup({ staticDeny: ['text'], runtimeAllows: true, viewerPagePid: 'uuid:page-OTHER' });
    c.selectedModel = 'page';
    c.selectedPid = 'uuid:page-1';

    expect(c.visibleTabs).not.toContain('ocr');
  });

  it('falls back to the static licences outside the detail view', () => {
    // Opened from search results: no DetailViewService to consult.
    const c = setup({ staticDeny: ['text'], withDetailView: false });
    c.selectedModel = 'page';
    c.selectedPid = 'uuid:page-1';

    expect(c.visibleTabs).not.toContain('ocr');
  });

  it('does not fetch a page-scoped tab the runtime licence denies', () => {
    const c = setup({ staticDeny: ['text'], runtimeAllows: false });
    const api = TestBed.inject(KrameriusApiService) as any;
    api.getAlto = jasmine.createSpy('getAlto');
    c.selectedModel = 'page';
    c.selectedPid = 'uuid:page-1';
    c.activeTabLabel = 'alto';

    c.loadData();

    expect(api.getAlto).not.toHaveBeenCalled();
  });
});
