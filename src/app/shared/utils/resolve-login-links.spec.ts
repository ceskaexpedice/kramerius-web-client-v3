import { resolveLoginLinks } from './resolve-login-links';

/**
 * Issue #146: after logging in through a login link in license HTML, the reader landed
 * on the homepage instead of the document. The license server's pages link to the
 * terms page with no returnUrl, so the terms page fell back to `/` after login.
 */
describe('resolveLoginLinks', () => {
  const returnUrl = '/view/uuid:1?page=uuid:2';
  const target = `/pages/terms?returnUrl=${encodeURIComponent(returnUrl)}`;

  it('adds the returnUrl to an absolute /pages/terms link', () => {
    expect(resolveLoginLinks('<a href="https://ceskadigitalniknihovna.cz/pages/terms">Přihlaste se</a>', returnUrl))
      .toBe(`<a href="${target}">Přihlaste se</a>`);
  });

  it('adds the returnUrl to an absolute /terms link', () => {
    expect(resolveLoginLinks('<a href="https://ceskadigitalniknihovna.cz/terms">přihlaste se</a>', returnUrl))
      .toBe(`<a href="${target}">přihlaste se</a>`);
  });

  it('adds the returnUrl to a relative terms link', () => {
    expect(resolveLoginLinks('<a href="/pages/terms">log in</a>', returnUrl)).toBe(`<a href="${target}">log in</a>`);
  });

  it('rewrites the legacy portal link with the ${PATH} placeholder, for any library code', () => {
    expect(resolveLoginLinks('<a href="/mzk/terms?redirect_path=${PATH}">x</a>', returnUrl))
      .toBe(`<a href="${target}">x</a>`);
    expect(resolveLoginLinks('<a href="https://www.digitalniknihovna.cz/knav/terms?redirect_path=${PATH}">x</a>', returnUrl))
      .toBe(`<a href="${target}">x</a>`);
  });

  it('keeps a terms link that already carries its own returnUrl', () => {
    const html = '<a href="/pages/terms?returnUrl=%2Fsearch">log in</a>';
    expect(resolveLoginLinks(html, returnUrl)).toBe(html);
  });

  it('leaves unrelated links untouched', () => {
    const html = '<a href="https://lib.cas.cz/studovna/">studovna</a> <a href="/pages/about">o projektu</a> <a href="https://dnnt.cz/terms-of-use">x</a>';
    expect(resolveLoginLinks(html, returnUrl)).toBe(html);
  });

  it('handles empty input', () => {
    expect(resolveLoginLinks('', returnUrl)).toBe('');
  });
});
