import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AiApiService } from './ai-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { ConfigService } from '../../core/config/config.service';

/**
 * Regression test: the AI proxy base URL used to be hardcoded in AiApiService,
 * so a deployment pointing at its own proxy had to patch the source. It now
 * comes from `api.aiProxyUrl` in config-main.json, like `citationUrl`/`georefUrl`,
 * with no built-in fallback — an unconfigured proxy must not quietly reach a
 * third-party default the deployment never opted into.
 */
describe('AiApiService base URL', () => {
  let httpMock: HttpTestingController;

  function setup(apiConfig: Record<string, string> | undefined): AiApiService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AiApiService,
        { provide: AuthService, useValue: { getAccessToken: () => 'test-token' } },
        { provide: ConfigService, useValue: { api: apiConfig } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.inject(AiApiService);
  }

  afterEach(() => httpMock.verify());

  it('calls the proxy configured in api.aiProxyUrl', () => {
    const service = setup({ aiProxyUrl: 'https://ai.example.org/api' });

    service.openAiTTS('ahoj', 'alloy').subscribe();

    const req = httpMock.expectOne(r => r.url.endsWith('/openai/tts'));
    expect(req.request.url).toBe('https://ai.example.org/api/openai/tts');
    req.flush({ audioContent: 'AAAA' });
  });

  it('uses no hardcoded proxy host when api.aiProxyUrl is missing', () => {
    const service = setup({});

    service.openAiTTS('ahoj', 'alloy').subscribe();

    const req = httpMock.expectOne(r => r.url.endsWith('/openai/tts'));
    expect(req.request.url).toBe('/openai/tts');
    expect(req.request.url).not.toContain('trinera.cloud');
    req.flush({ audioContent: 'AAAA' });
  });

  it('re-reads the config for each request rather than caching a build-time URL', () => {
    const api: Record<string, string> = { aiProxyUrl: 'https://first.example.org/api' };
    const service = setup(api);

    service.openAiTTS('a', 'alloy').subscribe();
    const first = httpMock.expectOne(r => r.url.endsWith('/openai/tts'));
    expect(first.request.url).toBe('https://first.example.org/api/openai/tts');
    first.flush({ audioContent: 'AAAA' });

    api['aiProxyUrl'] = 'https://second.example.org/api';
    service.openAiTTS('b', 'alloy').subscribe();
    const second = httpMock.expectOne(r => r.url.endsWith('/openai/tts'));
    expect(second.request.url).toBe('https://second.example.org/api/openai/tts');
    second.flush({ audioContent: 'AAAA' });
  });
});
