import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { EnvironmentService } from '../../shared/services/environment.service';
import { tokenInterceptor } from './token.interceptor';

/**
 * Regression test for issue "AI functions log the user out".
 *
 * The interceptor ran on every request, including the third-party AI proxy. A
 * 401 from that proxy — which has its own authorization, unrelated to the CDK
 * session — was treated as an expired CDK token: it triggered refreshToken(),
 * which hits an endpoint the backend only exposes as GET-with-code (hence 405),
 * and the failed refresh logged the user out. Three unrelated systems, one
 * spurious logout.
 */
describe('tokenInterceptor origin scoping', () => {

  const API_ORIGIN = 'https://cdk-api.dev.example.cz';
  const API_URL = `${API_ORIGIN}/search/api/client/v7.0/user/`;
  const PROXY_URL = 'https://ai-proxy.example.cz/api/openai/chat/completions';

  let refreshCalls: number;
  let logoutCalls: number;

  function setup(): { http: HttpClient; httpMock: HttpTestingController } {
    refreshCalls = 0;
    logoutCalls = 0;

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([tokenInterceptor])),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            getAccessToken: () => 'cdk-token',
            isTokenExpired: () => false,
            refreshToken: () => {
              refreshCalls++;
              throw new Error('refresh must not be attempted here');
            },
            logout: () => { logoutCalls++; },
          },
        },
        {
          provide: EnvironmentService,
          useValue: {
            getApiUrl: () => API_URL,
            getApiConfigBaseUrl: () => API_URL,
          },
        },
      ],
    });

    return {
      http: TestBed.inject(HttpClient),
      httpMock: TestBed.inject(HttpTestingController),
    };
  }

  it('does not refresh or log out when a third-party host answers 401', () => {
    const { http, httpMock } = setup();

    let capturedError: unknown = null;
    http.post(PROXY_URL, {}).subscribe({
      next: () => fail('expected the proxy 401 to surface as an error'),
      error: (err) => { capturedError = err; },
    });

    httpMock.expectOne(PROXY_URL).flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(refreshCalls).toBe(0);
    expect(logoutCalls).toBe(0);
    expect((capturedError as { status?: number } | null)?.status).toBe(401);

    httpMock.verify();
  });

  it('does not attach the CDK token to a third-party host', () => {
    const { http, httpMock } = setup();

    http.post(PROXY_URL, {}).subscribe({ error: () => {} });

    const req = httpMock.expectOne(PROXY_URL);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});

    httpMock.verify();
  });

  it('still attaches the CDK token to our own API', () => {
    const { http, httpMock } = setup();

    const ownUrl = `${API_ORIGIN}/search/api/client/v7.0/items/knav/uuid:1/ocr/alto`;
    http.get(ownUrl).subscribe({ error: () => {} });

    const req = httpMock.expectOne(ownUrl);
    expect(req.request.headers.get('Authorization')).toBe('Bearer cdk-token');
    req.flush({});

    httpMock.verify();
  });

  it('still attaches the CDK token to a relative URL', () => {
    const { http, httpMock } = setup();

    http.get('/search/api/client/v7.0/user').subscribe({ error: () => {} });

    const req = httpMock.expectOne('/search/api/client/v7.0/user');
    expect(req.request.headers.get('Authorization')).toBe('Bearer cdk-token');
    req.flush({});

    httpMock.verify();
  });
});
