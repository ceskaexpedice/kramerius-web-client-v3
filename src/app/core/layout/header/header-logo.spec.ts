import { HeaderComponent } from './header.component';
import { AppConfig } from '../../config/config.interfaces';

/**
 * Guards logo resolution in the header. Two things are covered:
 *
 * 1. Dark-theme selection — the template picks between `headerLogo` and
 *    `headerLogoDark` by the effective theme, so a library that configures
 *    `app.logoDark` must get it in dark mode, and one that does not must keep
 *    its single logo in both themes.
 * 2. No implicit branding — a deployment that configures no logo must render
 *    none. The header used to substitute the bundled CDK logos (for any
 *    `app.code` containing "cdk") or `/favicon.svg`, so an unbranded instance
 *    still displayed someone else's mark.
 *
 * Branding resolution is exercised directly: it only reads ConfigService, so
 * the component is used as a plain object rather than through TestBed, which
 * would drag in the header's whole dependency graph.
 */
describe('HeaderComponent logo resolution', () => {
  function resolve(app: Partial<AppConfig>, isCdk = false): { light: string; dark: string } {
    const component = Object.create(HeaderComponent.prototype) as HeaderComponent;
    (component as any).configService = { app, isCdk: () => isCdk };
    (component as any).resolveBranding();
    return { light: component.headerLogo, dark: component.headerLogoDark };
  }

  it('uses the configured dark logo in dark theme', () => {
    const { light, dark } = resolve({ logo: '/img/mzk.svg', logoDark: '/img/mzk-dark.svg' });
    expect(light).toBe('/img/mzk.svg');
    expect(dark).toBe('/img/mzk-dark.svg');
  });

  it('falls back to the light logo when no dark variant is configured', () => {
    const { light, dark } = resolve({ logo: '/img/mzk.svg' });
    expect(light).toBe('/img/mzk.svg');
    expect(dark).toBe('/img/mzk.svg');
  });

  it('renders no logo at all when none is configured', () => {
    const { light, dark } = resolve({});
    expect(light).toBe('');
    expect(dark).toBe('');
  });

  it('never substitutes a favicon for a missing logo', () => {
    const { light, dark } = resolve({});
    expect(light).not.toContain('favicon');
    expect(dark).not.toContain('favicon');
  });

  it('honours the configured logo on a CDK instance instead of overriding it', () => {
    const { light, dark } = resolve({ logo: '/img/other.svg', logoDark: '/img/other-dark.svg' }, true);
    expect(light).toBe('/img/other.svg');
    expect(dark).toBe('/img/other-dark.svg');
  });

  it('renders no logo on a CDK instance that configures none', () => {
    const { light, dark } = resolve({}, true);
    expect(light).toBe('');
    expect(dark).toBe('');
  });

  it('swaps a broken dark logo back to the light one', () => {
    const component = Object.create(HeaderComponent.prototype) as HeaderComponent;
    component.headerLogo = '/img/mzk.svg';
    component.headerLogoDark = '/img/missing-dark.svg';
    const img = { src: '/img/missing-dark.svg', style: {}, getAttribute: () => '/img/missing-dark.svg' } as any;
    component.onLogoError(img);
    expect(img.src).toBe('/img/mzk.svg');
  });

  it('hides the image instead of looping when the light logo is broken too', () => {
    const component = Object.create(HeaderComponent.prototype) as HeaderComponent;
    component.headerLogo = '/img/mzk.svg';
    const img = { src: '/img/mzk.svg', style: {} as any, getAttribute: () => '/img/mzk.svg' } as any;
    component.onLogoError(img);
    expect(img.style.display).toBe('none');
  });

  it('hides a broken dark logo when there is no light logo to fall back to', () => {
    const component = Object.create(HeaderComponent.prototype) as HeaderComponent;
    component.headerLogo = '';
    component.headerLogoDark = '/img/missing-dark.svg';
    const img = { src: '/img/missing-dark.svg', style: {} as any, getAttribute: () => '/img/missing-dark.svg' } as any;
    component.onLogoError(img);
    expect(img.style.display).toBe('none');
    expect(img.src).toBe('/img/missing-dark.svg');
  });

  describe('activeLogo (drives the template @if, so an empty src is never rendered)', () => {
    function active(app: Partial<AppConfig>, theme: 'light' | 'dark'): string {
      const component = Object.create(HeaderComponent.prototype) as HeaderComponent;
      (component as any).configService = { app, isCdk: () => false };
      (component as any).resolveBranding();
      component.effectiveTheme = theme;
      return component.activeLogo;
    }

    it('is empty in both themes when no logo is configured', () => {
      expect(active({}, 'light')).toBe('');
      expect(active({}, 'dark')).toBe('');
    });

    it('serves the light logo in both themes when only `logo` is configured', () => {
      expect(active({ logo: '/img/mzk.svg' }, 'light')).toBe('/img/mzk.svg');
      expect(active({ logo: '/img/mzk.svg' }, 'dark')).toBe('/img/mzk.svg');
    });

    it('serves the dark variant in dark theme when configured', () => {
      expect(active({ logo: '/img/mzk.svg', logoDark: '/img/mzk-dark.svg' }, 'dark')).toBe('/img/mzk-dark.svg');
    });
  });
});
