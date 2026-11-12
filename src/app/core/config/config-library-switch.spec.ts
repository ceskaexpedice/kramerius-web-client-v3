import { TestBed } from '@angular/core/testing';
import { ConfigService } from './config.service';
import { EnvironmentService } from '../../shared/services/environment.service';
import {
  DEV_LIBRARY_ID_KEY,
  __resetDevLibraryStorageForTests,
} from '../../shared/utils/dev-library-storage';

/**
 * Regression (#157): with another library selected through the internal
 * library switch, the config falls back to registry branding. That fallback
 * had no content pages, so /pages/gdpr and /pages/faq showed "page not found".
 */
describe('ConfigService with a switched-to library', () => {
  const basePages = [
    { id: 'gdpr', url: { cs: 'local-config/html/gdpr/gdpr.cs.html' } },
    { id: 'faq', url: { cs: 'local-config/html/faq/faq.cs.html' } },
  ];

  let service: ConfigService;

  beforeEach(() => {
    __resetDevLibraryStorageForTests();
    sessionStorage.setItem(DEV_LIBRARY_ID_KEY, 'mzk');

    TestBed.configureTestingModule({
      providers: [
        ConfigService,
        { provide: EnvironmentService, useValue: { applyAppConfig: () => {} } },
      ],
    });
    service = TestBed.inject(ConfigService);

    spyOn<any>(service, 'fetchLibraryConfig').and.resolveTo({
      ...service.getConfig(),
      app: { code: 'cdk', name: 'CDK' },
      features: { librarySwitch: true },
      pages: basePages,
    });
    spyOn(service, 'getActiveLibrary').and.resolveTo({ name: 'MZK', name_en: 'MZK', logo: '' });
  });

  afterEach(() => sessionStorage.removeItem(DEV_LIBRARY_ID_KEY));

  it('keeps the base config content pages', async () => {
    await service.load();

    expect(service.getConfig().app.code).toBe('mzk');
    expect(service.getPage('gdpr')).toBeDefined();
    expect(service.getPage('faq')).toBeDefined();
  });
});
