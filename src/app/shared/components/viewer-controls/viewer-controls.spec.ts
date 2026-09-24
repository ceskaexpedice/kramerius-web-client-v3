import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { ViewerControls } from './viewer-controls';
import { PdfService } from '../../services/pdf.service';
import { IIIFViewerService } from '../../services/iiif-viewer.service';
import { EpubService } from '../../services/epub.service';
import { ConfigService } from '../../../core/config';
import { AiPanelService } from '../../services/ai-panel.service';
import { DetailViewService } from '../../../modules/detail-view-page/services/detail-view.service';
import { MapViewerService } from '../../services/map-viewer.service';
import { TtsService } from '../../services/tts.service';

/**
 * Regression test for issue #161: on compact viewports the floating viewer
 * controls collapse into the toolbar's "more" menu, which is built from
 * getMenuItems(). The read-aloud buttons existed only in the floating template,
 * so a user reading on a phone had no way to stop it.
 */
describe('ViewerControls.getMenuItems TTS entries', () => {
  let component: ViewerControls;
  let tts: { isReading: any; isPaused: any; playbackBlocked: any; togglePlayPause: jasmine.Spy; stop: jasmine.Spy };

  beforeEach(() => {
    tts = {
      isReading: signal(false),
      isPaused: signal(false),
      playbackBlocked: signal(false),
      togglePlayPause: jasmine.createSpy('togglePlayPause'),
      stop: jasmine.createSpy('stop'),
    };

    TestBed.configureTestingModule({
      imports: [ViewerControls],
      providers: [
        { provide: PdfService, useValue: { properties$: of({}), pdfProperties: {} } },
        { provide: IIIFViewerService, useValue: {
          bookMode$: of(false), zoomLock$: of(false), mapMode$: of(false),
          isMapMode: () => false, isBookMode: () => false,
        } },
        { provide: EpubService, useValue: {} },
        { provide: ConfigService, useValue: {
          isViewerControlEnabled: () => true,
          isFeatureEnabled: () => true,
          isViewerModeAvailable: () => true,
        } },
        { provide: AiPanelService, useValue: { panelVisible: signal(false) } },
        { provide: DetailViewService, useValue: { isActionAllowed: () => true } },
        { provide: MapViewerService, useValue: {} },
        { provide: TtsService, useValue: tts },
      ],
    });

    const fixture = TestBed.createComponent(ViewerControls);
    component = fixture.componentInstance;
    component.type = 'image';
  });

  const ids = () => component.getMenuItems().map(i => i.id);

  it('omits read-aloud entries when nothing is being read', () => {
    expect(ids()).not.toContain('tts-play-pause');
    expect(ids()).not.toContain('tts-stop');
  });

  it('offers pause and stop while reading', () => {
    tts.isReading.set(true);

    expect(ids()).toContain('tts-play-pause');
    expect(ids()).toContain('tts-stop');
  });

  it('shows a resume affordance when paused', () => {
    tts.isReading.set(true);
    tts.isPaused.set(true);

    const item = component.getMenuItems().find(i => i.id === 'tts-play-pause')!;
    expect(item.icon).toBe('icon-play');
    expect(item.tooltip).toBe('ai.tts-resume');
  });

  it('shows a pause affordance while actively playing', () => {
    tts.isReading.set(true);

    const item = component.getMenuItems().find(i => i.id === 'tts-play-pause')!;
    expect(item.icon).toBe('icon-pause');
    expect(item.tooltip).toBe('ai.tts-pause');
  });

  it('tells the user to tap when playback was blocked', () => {
    tts.isReading.set(true);
    tts.playbackBlocked.set(true);

    const item = component.getMenuItems().find(i => i.id === 'tts-play-pause')!;
    expect(item.tooltip).toBe('ai.tts-blocked');
  });

  it('routes the menu ids to the TTS actions', () => {
    tts.isReading.set(true);

    component.handleMenuAction('tts-play-pause');
    expect(tts.togglePlayPause).toHaveBeenCalled();

    component.handleMenuAction('tts-stop');
    expect(tts.stop).toHaveBeenCalled();
  });

});

/**
 * The page-text button opens a panel holding the page's full ALTO transcript, so
 * it has to answer to the same `text` permission as any other route to that text.
 * It shipped gated only on the `ai` feature flag, which offered a complete
 * transcript of every DNNTO page whose licence sets `text: false`.
 */
describe('ViewerControls page-text licence gate', () => {
  let component: ViewerControls;
  let allowed: boolean;
  let aiPanel: { panelVisible: any; showPageText: jasmine.Spy };

  function build(detailView: unknown) {
    TestBed.resetTestingModule();
    aiPanel = {
      panelVisible: signal(false),
      showPageText: jasmine.createSpy('showPageText'),
    };

    TestBed.configureTestingModule({
      imports: [ViewerControls],
      providers: [
        { provide: PdfService, useValue: { properties$: of({}), pdfProperties: {} } },
        { provide: IIIFViewerService, useValue: {
          bookMode$: of(false), zoomLock$: of(false), mapMode$: of(false),
          isMapMode: () => false, isBookMode: () => false,
        } },
        { provide: EpubService, useValue: {} },
        { provide: ConfigService, useValue: {
          isViewerControlEnabled: () => true,
          isFeatureEnabled: () => true,
          isViewerModeAvailable: () => true,
        } },
        { provide: AiPanelService, useValue: aiPanel },
        { provide: DetailViewService, useValue: detailView },
        { provide: MapViewerService, useValue: {} },
        { provide: TtsService, useValue: {
          isReading: signal(false), isPaused: signal(false), playbackBlocked: signal(false),
        } },
      ],
    });

    const fixture = TestBed.createComponent(ViewerControls);
    component = fixture.componentInstance;
    component.type = 'image';
  }

  beforeEach(() => {
    allowed = true;
    build({
      currentPagePid: 'uuid:page-1',
      isActionAllowed: (action: string) => action === 'text' ? allowed : true,
    });
  });

  it('offers the transcript when the licence permits text', () => {
    expect(component.showPageText).toBe(true);
    expect(component.getMenuItems().map(i => i.id)).toContain('page-text');
  });

  it('withholds the transcript when the licence denies text', () => {
    allowed = false;

    expect(component.showPageText).toBe(false);
    expect(component.getMenuItems().map(i => i.id)).not.toContain('page-text');
  });

  it('does not open the panel even if the denied action is invoked directly', () => {
    allowed = false;

    component.onPageText();
    component.handleMenuAction('page-text');

    expect(aiPanel.showPageText).not.toHaveBeenCalled();
  });

  it('opens the panel for the current page when permitted', () => {
    component.handleMenuAction('page-text');

    expect(aiPanel.showPageText).toHaveBeenCalledWith('uuid:page-1');
  });

  it('falls open outside the detail view, where no DetailViewService is provided', () => {
    build(null);

    expect(component.showPageText).toBe(true);
  });

  /**
   * The transcript is read out of the page's ALTO OCR, which only exists for
   * scanned pages. A PDF ships its own selectable text layer, so the button
   * offered nothing there but a second, worse copy of text already on screen.
   */
  it('withholds the transcript in the PDF viewer, which has its own text layer', () => {
    component.type = 'pdf';

    expect(component.showPageText).toBe(false);
    expect(component.getMenuItems().map(i => i.id)).not.toContain('page-text');
  });

  it('still offers the transcript in the image viewer', () => {
    component.type = 'image';

    expect(component.showPageText).toBe(true);
  });

});

/**
 * The menu ids from getMenuItems() only reach the viewer once
 * DetailViewPageComponent's allowlist recognises them. It is a plain static Set,
 * so a new menu entry that is not added there is silently dropped on tap — which
 * is exactly what happened to the read-aloud buttons on mobile (issue #161).
 */
describe('viewer menu action ids are routable', () => {

  it('every id getMenuItems can emit is present in the detail page allowlist', async () => {
    const { DetailViewPageComponent } = await import(
      '../../../modules/detail-view-page/detail-view-page.component'
    );
    const allowlist: Set<string> = (DetailViewPageComponent as any).VIEWER_MENU_ACTION_IDS;

    // Ids handleMenuAction knows how to route.
    const routableIds = [
      'select-area', 'fullscreen', 'fit-to-screen', 'fit-to-width',
      'zoom-lock', 'scroll-mode', 'rotate', 'page-text', 'book-mode',
      'tts-play-pause', 'tts-stop',
    ];

    for (const id of routableIds) {
      expect(allowlist.has(id)).withContext(`"${id}" missing from VIEWER_MENU_ACTION_IDS`).toBe(true);
    }
  });

});
