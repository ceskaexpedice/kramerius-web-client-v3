import { TestBed } from '@angular/core/testing';
import { ConfigService } from './config.service';
import { EnvironmentService } from '../../shared/services/environment.service';

/**
 * Regression tests for feature flags that were declared in the config schema but
 * never read anywhere in the app: `features.keycloak` was documented as hiding
 * the whole authenticated surface, yet setting it to `false` changed nothing.
 */
describe('ConfigService feature flags', () => {
  let service: ConfigService;

  function seedFeatures(features: Record<string, unknown>): void {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [ConfigService, { provide: EnvironmentService, useValue: {} }],
    });
    service = TestBed.inject(ConfigService);
    (service as any).config$.next({ ...service.getConfig(), features });
  }

  describe('isLoginEnabled', () => {
    it('is false when features.keycloak is false', () => {
      seedFeatures({ keycloak: false });
      expect(service.isLoginEnabled()).toBe(false);
    });

    it('is true when features.keycloak is true', () => {
      seedFeatures({ keycloak: true });
      expect(service.isLoginEnabled()).toBe(true);
    });

    it('defaults to enabled when the flag is omitted', () => {
      seedFeatures({});
      expect(service.isLoginEnabled()).toBe(true);
    });
  });

  describe('isFoldersEnabled', () => {
    it('is false when login is off, regardless of features.folders', () => {
      seedFeatures({ keycloak: false, folders: true });
      expect(service.isFoldersEnabled()).toBe(false);
    });

    it('is false when features.folders is off', () => {
      seedFeatures({ keycloak: true, folders: false });
      expect(service.isFoldersEnabled()).toBe(false);
    });

    it('is true when both flags are on', () => {
      seedFeatures({ keycloak: true, folders: true });
      expect(service.isFoldersEnabled()).toBe(true);
    });
  });
});
