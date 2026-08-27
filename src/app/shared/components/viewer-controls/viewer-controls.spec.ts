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
        { provide: DetailViewService, useValue: {} },
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
