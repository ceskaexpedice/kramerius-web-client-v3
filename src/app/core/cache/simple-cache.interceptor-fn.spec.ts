import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { clearSimpleCache, simpleCacheInterceptor } from './simple-cache.interceptor-fn';

describe('simpleCacheInterceptor', () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;

  beforeEach(() => {
    clearSimpleCache();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([simpleCacheInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    ctrl.verify();
    clearSimpleCache();
  });

  function getTwice(url: string, responseType: 'json' | 'text' = 'json') {
    const opts = responseType === 'text' ? { responseType: 'text' as const } : {};
    http.get(url, opts as any).subscribe();
    ctrl.expectOne(url).flush(responseType === 'text' ? '<alto/>' : { ok: true });
    http.get(url, opts as any).subscribe();
  }

  it('serves a repeated metadata request from the cache', () => {
    getTwice('https://api/items/uuid:1/metadata/mods');
    expect(ctrl.match('https://api/items/uuid:1/metadata/mods').length).toBe(0);
  });

  // Each consumer of a page's OCR (viewer text layer, metadata dialog, TTS, AI
  // panel, in-document search) tags its request with its own
  // X-Kramerius-Intent; a localStorage hit would hide every one after the first.
  it('never caches ALTO', () => {
    getTwice('https://api/items/uuid:1/ocr/alto', 'text');
    const second = ctrl.match('https://api/items/uuid:1/ocr/alto');
    expect(second.length).toBe(1);
    second.forEach(r => r.flush('<alto/>'));
  });

  it('never caches plain OCR text, including a CDK-source prefixed path', () => {
    getTwice('https://api/items/knav/uuid:1/ocr/text', 'text');
    const second = ctrl.match('https://api/items/knav/uuid:1/ocr/text');
    expect(second.length).toBe(1);
    second.forEach(r => r.flush('text'));
  });
});
