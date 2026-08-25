import { HeaderComponent } from './header.component';
import { AppConfig } from '../../config/config.interfaces';

/**
 * Guards dark-theme logo resolution in the header. The template picks between
 * `headerLogo` and `headerLogoDark` by the effective theme, so a library that
 * configures `app.logoDark` must get it in dark mode — and one that does not
 * must keep its single logo in both themes (the pre-existing behavior).
 *
 * Branding resolution is exercised directly: it only reads ConfigService, so
 * the component is used as a plain object rather than through TestBed, which
 * would drag in the header's whole dependency graph.
 */
describe('HeaderComponent dark-theme logo', () => {
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

  it('falls back to the bundled favicons when no logo is configured at all', () => {
    const { light, dark } = resolve({});
    expect(light).toBe('/favicon.svg');
    expect(dark).toBe('/favicon-dark.svg');
  });

  it('keeps CDK on its bundled logos regardless of config', () => {
    const { light, dark } = resolve({ logo: '/img/other.svg', logoDark: '/img/other-dark.svg' }, true);
    expect(light).toBe('img/logo.svg');
    expect(dark).toBe('img/logo-darkmode.svg');
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
});
