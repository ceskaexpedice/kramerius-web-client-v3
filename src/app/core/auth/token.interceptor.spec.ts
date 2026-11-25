import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { EnvironmentService } from '../../shared/services/environment.service';
import { tokenInterceptor } from './token.interceptor';

/**
 * The backend has no token refresh: an expired or rejected access token ends
 * the local session. Only our own API takes part — a 401 from a third-party
 * host (the AI proxy) must never end the CDK session ("AI functions log the
 * user out").
 */
describe('tokenInterceptor', () => {

  const API_ORIGIN = 'https://cdk-api.dev.example.cz';
  const API_URL = `${API_ORIGIN}/search/api/client/v7.0/user/`;
  const OWN_URL = `${API_ORIGIN}/search/api/client/v7.0/items/knav/uuid:1/ocr/alto`;
  const PROXY_URL = 'https://ai-proxy.example.cz/api/openai/chat/completions';

  let expireCalls: number;

  function setup(
    { token = 'cdk-token' as string | null, expired = false } = {},
  ): { http: HttpClient; httpMock: HttpTestingController } {
    expireCalls = 0;

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([tokenInterceptor])),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            getAccessToken: () => token,
            isTokenExpired: () => expired,
            expireSession: () => { expireCalls++; },
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

  it('does not end the session when a third-party host answers 401', () => {
    const { http, httpMock } = setup();

    let capturedError: unknown = null;
    http.post(PROXY_URL, {}).subscribe({
      next: () => fail('expected the proxy 401 to surface as an error'),
      error: (err) => { capturedError = err; },
    });

    httpMock.expectOne(PROXY_URL).flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(expireCalls).toBe(0);
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

  it('attaches the CDK token to our own API', () => {
    const { http, httpMock } = setup();

    http.get(OWN_URL).subscribe({ error: () => {} });

    const req = httpMock.expectOne(OWN_URL);
    expect(req.request.headers.get('Authorization')).toBe('Bearer cdk-token');
    req.flush({});
    httpMock.verify();
  });

  it('attaches the CDK token to a relative URL', () => {
    const { http, httpMock } = setup();

    http.get('/search/api/client/v7.0/user').subscribe({ error: () => {} });

    const req = httpMock.expectOne('/search/api/client/v7.0/user');
    expect(req.request.headers.get('Authorization')).toBe('Bearer cdk-token');
    req.flush({});
    httpMock.verify();
  });

  it('ends the session and sends the request anonymously once the token has expired', () => {
    const { http, httpMock } = setup({ expired: true });

    http.get(OWN_URL).subscribe({ error: () => {} });

    const req = httpMock.expectOne(OWN_URL);
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(expireCalls).toBe(1);
    req.flush({});
    httpMock.verify();
  });

  it('ends the session when our API rejects the token with 401', () => {
    const { http, httpMock } = setup();

    let capturedError: unknown = null;
    http.get(OWN_URL).subscribe({
      next: () => fail('expected the 401 to surface as an error'),
      error: (err) => { capturedError = err; },
    });

    httpMock.expectOne(OWN_URL).flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(expireCalls).toBe(1);
    expect((capturedError as { status?: number } | null)?.status).toBe(401);
    httpMock.verify();
  });

  it('keeps the session on other errors from our API', () => {
    const { http, httpMock } = setup();

    http.get(OWN_URL).subscribe({ error: () => {} });
    httpMock.expectOne(OWN_URL).flush('Forbidden', { status: 403, statusText: 'Forbidden' });

    expect(expireCalls).toBe(0);
    httpMock.verify();
  });

  it('passes a 401 through for an anonymous visitor without touching the session', () => {
    const { http, httpMock } = setup({ token: null });

    let capturedError: unknown = null;
    http.get(OWN_URL).subscribe({
      next: () => fail('expected the 401 to surface as an error'),
      error: (err) => { capturedError = err; },
    });

    const req = httpMock.expectOne(OWN_URL);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(expireCalls).toBe(0);
    expect((capturedError as { status?: number } | null)?.status).toBe(401);
    httpMock.verify();
  });
});
