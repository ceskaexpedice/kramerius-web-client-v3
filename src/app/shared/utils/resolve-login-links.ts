import { APP_ROUTES_ENUM } from '../../app.routes';

/** Legacy digitalniknihovna.cz portal link, `/<library>/terms?redirect_path=${PATH}`. */
const LEGACY_LOGIN_LINK = /^(?:https?:\/\/[^/"']*)?\/[\w-]+\/terms\?redirect_path=\$\{PATH\}$/;

/**
 * Points the login links inside config HTML (license instruction and message pages)
 * at the app's terms route with `returnUrl` as the post-login destination. Without it
 * the terms page falls back to `/`, so a reader who logs in from a document's license
 * text ends up on the homepage instead of back on the document.
 *
 * Two forms occur in the wild:
 *  - links copied from the legacy digitalniknihovna.cz portal,
 *    `.../mzk/terms?redirect_path=${PATH}`, where `${PATH}` is a placeholder the
 *    portal substituted server-side; in this app that path 404s;
 *  - links to this app's own terms page (`/pages/terms`, `/terms`), which the license
 *    server writes absolute, e.g. `https://ceskadigitalniknihovna.cz/pages/terms`,
 *    and with no returnUrl at all.
 * Both are matched relative or absolute on any host: the HTML hardcodes the production
 * domain, but the login it asks for is always this instance's. A terms link that
 * already sets its own returnUrl is left as it is.
 */
export function resolveLoginLinks(html: string, returnUrl: string): string {
  if (!html) return html;

  const target = `/${APP_ROUTES_ENUM.PAGES}/terms?returnUrl=${encodeURIComponent(returnUrl)}`;
  // This app's terms page, `/pages/terms` or the `/terms` redirect to it. Built here,
  // not at module load: `app.routes` imports the components that import this file.
  const termsLink = new RegExp(`^(?:https?://[^/"']*)?(?:/${APP_ROUTES_ENUM.PAGES})?/terms/?(?:[?#].*)?$`);

  return html.replace(/href="([^"]*)"/g, (attribute, href: string) => {
    const isLoginLink = LEGACY_LOGIN_LINK.test(href)
      || (termsLink.test(href) && !/[?&]returnUrl=/.test(href));
    return isLoginLink ? `href="${target}"` : attribute;
  });
}
