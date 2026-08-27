import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { AiApiService, isQuotaExceeded, AI_QUOTA_EXCEEDED } from './ai-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { ConfigService } from '../../core/config/config.service';
import { TtsService } from './tts.service';
import { AltoService } from './alto.service';
import { DetailViewService } from '../../modules/detail-view-page/services/detail-view.service';
import { IIIFViewerService } from './iiif-viewer.service';
import { SettingsService } from '../../modules/settings/settings.service';
import { ToastService } from './toast.service';

/**
 * The AI proxy answers with a quota body once the monthly token budget is spent:
 *
 *   { "errorMessage": "your quota for tokens for this month was exceeded",
 *     "errorCode": "quota_exceeded", ... }
 *
 * Reading used to treat this as an ordinary per-block failure: it retried block
 * after block — each one a wasted call answered identically — until the
 * consecutive-failure ceiling, then stopped with nothing shown to the user.
 * Playback must abort at the first quota answer and say why.
 */
describe('AI quota exhaustion', () => {

  /** The proxy's quota response, verbatim from the report. */
  const QUOTA_BODY = {
    errorMessage: 'your quota for tokens for this month was exceeded',
    errorCode: 'quota_exceeded',
    tokens_available_per_month: 30,
    tokens_consumed_this_month: 32060,
  };

  describe('AiApiService error normalization', () => {
    let service: AiApiService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          AiApiService,
          { provide: AuthService, useValue: { getAccessToken: () => 'test-token' } },
          { provide: ConfigService, useValue: { api: { aiProxyUrl: 'https://ai.example.org/api' } } },
        ],
      });
      service = TestBed.inject(AiApiService);
      httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('surfaces quota_exceeded when the proxy answers with an error status', () => {
      let caught: Error | null = null;
      service.openAiTTS('text', 'alloy').subscribe({ error: err => (caught = err) });

      httpMock.expectOne(r => r.url.endsWith('/openai/tts'))
        .flush(QUOTA_BODY, { status: 429, statusText: 'Too Many Requests' });

      expect(caught!.message).toBe(AI_QUOTA_EXCEEDED);
      expect(isQuotaExceeded(caught)).toBe(true);
    });

    /**
     * The 200 case is the one that used to be lost: the body flowed into the
     * endpoint's `map()`, which reads a success shape (`r.data.detections[...]`)
     * and threw an opaque TypeError instead of the real reason.
     */
    it('surfaces quota_exceeded when the proxy answers with HTTP 200', () => {
      let caught: Error | null = null;
      service.detectLanguage('nejaky text').subscribe({ error: err => (caught = err) });

      httpMock.expectOne(r => r.url.endsWith('/google/translate/detect')).flush(QUOTA_BODY);

      expect(caught!.message).toBe(AI_QUOTA_EXCEEDED);
    });

    it('still reports unauthorized for a 401 without an errorCode body', () => {
      let caught: Error | null = null;
      service.openAiTTS('text', 'alloy').subscribe({ error: err => (caught = err) });

      httpMock.expectOne(r => r.url.endsWith('/openai/tts'))
        .flush({}, { status: 401, statusText: 'Unauthorized' });

      expect(caught!.message).toBe('unauthorized');
      expect(isQuotaExceeded(caught)).toBe(false);
    });

    it('passes a normal successful response through untouched', () => {
      let result: string | null = null;
      service.openAiTTS('text', 'alloy').subscribe(r => (result = r));

      httpMock.expectOne(r => r.url.endsWith('/openai/tts')).flush({ audioContent: 'AAAA' });

      expect(result!).toBe('AAAA');
    });
  });

  describe('TtsService playback abort', () => {
    let service: TtsService;
    let aiApiStub: { textToSpeech: jasmine.Spy; detectLanguage: jasmine.Spy; translate: jasmine.Spy };
    let toastStub: { show: jasmine.Spy };
    let detailViewStub: { pages: { pid: string }[]; goToPage: jasmine.Spy };

    const BLOCKS = [
      { text: 'first block' },
      { text: 'second block' },
      { text: 'third block' },
      { text: 'fourth block' },
    ];

    const quotaError = () => throwError(() => new Error(AI_QUOTA_EXCEEDED));

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
      toastStub = { show: jasmine.createSpy('show') };

      TestBed.resetTestingModule();
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
          { provide: ToastService, useValue: toastStub },
        ],
      });
      service = TestBed.inject(TtsService);
      const audio = (service as any).audio as HTMLAudioElement;
      // Keep the browser's autoplay policy out of these assertions.
      spyOn(audio, 'play').and.returnValue(Promise.resolve());
    });

    afterEach(() => service.stop());

    const settle = () => new Promise(r => setTimeout(r, 0));

    it('stops reading when TTS reports the quota is exhausted', async () => {
      aiApiStub.textToSpeech.and.returnValue(quotaError());

      service.startReading('page-1');
      await settle();

      expect(service.isReading()).toBe(false);
    });

    it('reports the quota message so the stop is explained', async () => {
      aiApiStub.textToSpeech.and.returnValue(quotaError());

      service.startReading('page-1');
      await settle();

      expect(service.error()).toBe('ai.quota-exceeded');
      expect(toastStub.show).toHaveBeenCalledWith('ai.quota-exceeded');
    });

    /**
     * The regression itself: without the quota check each remaining block is
     * requested in turn before the failure ceiling ends the run.
     */
    it('does not keep requesting further blocks after a quota answer', async () => {
      aiApiStub.textToSpeech.and.returnValue(quotaError());

      service.startReading('page-1');
      await settle();

      expect(aiApiStub.textToSpeech).toHaveBeenCalledTimes(1);
      expect(detailViewStub.goToPage).not.toHaveBeenCalled();
    });

    it('aborts when language detection is the call that hits the quota', async () => {
      aiApiStub.detectLanguage.and.returnValue(quotaError());

      service.startReading('page-1');
      await settle();

      expect(service.isReading()).toBe(false);
      expect(service.error()).toBe('ai.quota-exceeded');
      // Reading must not fall back to Czech and carry on into doomed TTS calls.
      expect(aiApiStub.textToSpeech).not.toHaveBeenCalled();
    });

    it('keeps skipping single bad blocks for non-quota failures', async () => {
      aiApiStub.textToSpeech.and.returnValue(throwError(() => new Error('unknown_error')));

      service.startReading('page-1');
      await settle();

      // The failure ceiling still governs ordinary errors, so more than one
      // block is attempted and no quota message is shown.
      expect(aiApiStub.textToSpeech.calls.count()).toBeGreaterThan(1);
      expect(service.error()).toBeNull();
      expect(toastStub.show).not.toHaveBeenCalled();
    });

    it('clears a previous quota error when the user starts reading again', async () => {
      aiApiStub.textToSpeech.and.returnValue(quotaError());
      service.startReading('page-1');
      await settle();
      expect(service.error()).toBe('ai.quota-exceeded');

      aiApiStub.textToSpeech.and.returnValue(of('AAAA'));
      service.startReading('page-1');
      await settle();

      expect(service.error()).toBeNull();
      expect(service.isReading()).toBe(true);
    });
  });
});
