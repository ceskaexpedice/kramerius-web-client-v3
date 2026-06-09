import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FoldersService } from './folders.service';
import { EnvironmentService } from '../../../shared/services/environment.service';
import { TranslateService } from '@ngx-translate/core';

describe('FoldersService follow/unfollow', () => {
  let service: FoldersService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        FoldersService,
        { provide: EnvironmentService, useValue: { getApiUrl: () => 'http://api/folders' } },
        { provide: TranslateService, useValue: { instant: (k: string) => k } },
      ],
    });
    service = TestBed.inject(FoldersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('POSTs to /{uuid}/follow', () => {
    service.followFolder('abc').subscribe();
    const req = httpMock.expectOne('http://api/folders/abc/follow');
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('POSTs to /{uuid}/unfollow', () => {
    service.unfollowFolder('abc').subscribe();
    const req = httpMock.expectOne('http://api/folders/abc/unfollow');
    expect(req.request.method).toBe('POST');
    req.flush({});
  });
});
