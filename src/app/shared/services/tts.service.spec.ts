import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TtsService } from './tts.service';
import { AltoService } from './alto.service';
import { AiApiService } from './ai-api.service';
import { DetailViewService } from '../../modules/detail-view-page/services/detail-view.service';
import { IIIFViewerService } from './iiif-viewer.service';
import { SettingsService } from '../../modules/settings/settings.service';
import { ToastService } from './toast.service';

/**
 * Regression tests for issue #161: on mobile, a blocked autoplay made reading
 * race through every block and page — highlighting text and turning pages while
 * playing nothing at all.
 */
describe('TtsService playback failure handling', () => {
  let service: TtsService;
  let detailViewStub: { pages: { pid: string }[]; goToPage: jasmine.Spy };
  let aiApiStub: { textToSpeech: jasmine.Spy; detectLanguage: jasmine.Spy; translate: jasmine.Spy };
  let audio: HTMLAudioElement;

  /** Blocks so we can tell "advanced" from "held position". */
  const BLOCKS = [
    { text: 'first block' },
    { text: 'second block' },
    { text: 'third block' },
    { text: 'fourth block' },
  ];

  beforeEach(() => {
    detailViewStub = {
      pages: [{ pid: 'page-1' }, { pid: 'page-2' }],
      goToPage: jasmine.createSpy('goToPage'),
    };
    aiApiStub = {
      textToSpeech: jasmine.createSpy('textToSpeech').and.returnValue(of('AAAA')),
      detectLanguage: jasmine.createSpy('detectLanguage').and.returnValue(of('cs')),
      translate: jasmine.createSpy('translate').and.callFake((t: string) => of(t)),
    };

    TestBed.configureTestingModule({
      providers: [
        TtsService,
        { provide: AltoService, useValue: {
          fetchAltoXml: () => of('<alto/>'),
          getBlocksForReading: () => BLOCKS,
        } },
        { provide: AiApiService, useValue: aiApiStub },
        { provide: DetailViewService, useValue: detailViewStub },
        { provide: IIIFViewerService, useValue: {
          showTtsHighlight: () => {},
          clearTtsHighlight: () => {},
        } },
        { provide: SettingsService, useValue: { settings: null } },
        { provide: ToastService, useValue: { show: () => {} } },
      ],
    });
    service = TestBed.inject(TtsService);
    audio = (service as any).audio as HTMLAudioElement;
  });

  afterEach(() => service.stop());

  /** Makes every play() attempt fail the way a mobile autoplay block does. */
  function blockAutoplay(): void {
    const err = new DOMException('play() failed', 'NotAllowedError');
    spyOn(audio, 'play').and.returnValue(Promise.reject(err));
  }

  function failPlaybackWith(name: string): void {
    spyOn(audio, 'play').and.returnValue(Promise.reject(new DOMException('nope', name)));
  }

  it('does not advance through blocks when autoplay is blocked', async () => {
    blockAutoplay();

    service.startReading('page-1');
    await new Promise(r => setTimeout(r, 0));

    // It must hold on the first block rather than racing to the end.
    expect(service.currentBlockIndex()).toBe(0);
    expect(detailViewStub.goToPage).not.toHaveBeenCalled();
  });

  it('reports blocked playback and pauses so the user can resume with a tap', async () => {
    blockAutoplay();

    service.startReading('page-1');
    await new Promise(r => setTimeout(r, 0));

    expect(service.playbackBlocked()).toBe(true);
    expect(service.isPaused()).toBe(true);
    // Still "reading" — the session is alive, just waiting for a gesture.
    expect(service.isReading()).toBe(true);
  });

  it('does not turn pages while blocked', async () => {
    blockAutoplay();

    service.startReading('page-1');
    await new Promise(r => setTimeout(r, 0));

    expect(detailViewStub.goToPage).not.toHaveBeenCalled();
    expect(service.currentPagePid()).toBe('page-1');
  });

  it('stops after repeated genuine playback failures instead of racing on', async () => {
    // A non-autoplay failure is a real error: skipping is allowed, but only up
    // to the ceiling, after which reading stops.
    failPlaybackWith('NotSupportedError');

    service.startReading('page-1');
    await new Promise(r => setTimeout(r, 0));

    expect(service.isReading()).toBe(false);
    expect(detailViewStub.goToPage).not.toHaveBeenCalled();
  });

  it('stops after repeated TTS API errors rather than skipping the whole document', async () => {
    aiApiStub.textToSpeech.and.returnValue(throwError(() => new Error('api down')));

    service.startReading('page-1');
    await new Promise(r => setTimeout(r, 0));

    expect(service.isReading()).toBe(false);
    expect(detailViewStub.goToPage).not.toHaveBeenCalled();
  });

  it('clears blocked state when reading stops', async () => {
    blockAutoplay();

    service.startReading('page-1');
    await new Promise(r => setTimeout(r, 0));
    expect(service.playbackBlocked()).toBe(true);

    service.stop();
    expect(service.playbackBlocked()).toBe(false);
    expect(service.isReading()).toBe(false);
  });

  it('re-requests the current block when resuming from a blocked start', async () => {
    blockAutoplay();

    service.startReading('page-1');
    await new Promise(r => setTimeout(r, 0));

    const callsBefore = aiApiStub.textToSpeech.calls.count();
    service.resume();
    await new Promise(r => setTimeout(r, 0));

    // Resume must fetch audio again, not play an element with no usable source.
    // (Playback stays blocked here because the stub rejects every play(); on a
    // real device the tap that triggered resume() is what lifts the block.)
    expect(aiApiStub.textToSpeech.calls.count()).toBeGreaterThan(callsBefore);
    // It must still not have raced ahead while blocked.
    expect(service.currentBlockIndex()).toBe(0);
    expect(detailViewStub.goToPage).not.toHaveBeenCalled();
  });

});
