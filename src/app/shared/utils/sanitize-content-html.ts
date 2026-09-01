/**
 * Strips colour and typography declarations from inline `style` attributes in
 * externally authored page HTML (see `public/local-config/html/`).
 *
 * Editors regularly paste content out of a WYSIWYG or a Word document, which
 * carries hardcoded `color: rgb(38, 51, 64)`, `font-family: "IBM Plex Sans"`,
 * `font-size: medium` and friends. Those values are baked against the light
 * theme, so they make text unreadable in dark mode and override the design
 * system.
 *
 * Layout declarations (margin, padding, text-align, list-style, width) are
 * intentionally kept — an editor may have set them on purpose — as are
 * `font-weight` and `font-style`, which express emphasis rather than theming.
 *
 * Any other attribute (href, src, lang, id, …) is left untouched, and a `style`
 * attribute whose declarations are all removed is dropped entirely.
 */

/** Declarations removed outright — colour, background and typography properties. */
const BLOCKED_PROPERTY = /^(-\w+-)?(color|background|font|text-decoration|text-emphasis|text-shadow|box-shadow|border|outline|caret-color|fill|stroke|opacity|filter|column-rule|text-fill-color|text-stroke)(-|$)/;

/**
 * Declarations that match BLOCKED_PROPERTY by prefix but must survive — either
 * pure layout (`border-radius` shapes a box without colouring it) or semantic
 * emphasis (`font-weight`, `font-style`), which carries meaning and renders the
 * same in either theme.
 */
const ALLOWED_EXCEPTION = /^(-\w+-)?(border-radius|border-width|border-collapse|border-spacing|border-style|font-weight|font-style|font-variant|font-variant-numeric|text-decoration-line|text-decoration-thickness|text-underline-offset|text-transform|text-indent|text-overflow|background-size|background-position|background-repeat|outline-offset|outline-width)$/;

function isBlockedDeclaration(property: string): boolean {
  const name = property.trim().toLowerCase();
  if (!name) return false;
  if (ALLOWED_EXCEPTION.test(name)) return false;
  return BLOCKED_PROPERTY.test(name);
}

/**
 * Rebuilds a `style` attribute value with colour and font declarations removed.
 * Returns an empty string when nothing survives.
 */
export function sanitizeStyleAttribute(value: string): string {
  return value
    .split(';')
    .map(declaration => declaration.trim())
    .filter(declaration => {
      if (!declaration) return false;
      const separator = declaration.indexOf(':');
      // A fragment with no colon is malformed — drop it rather than re-emit it.
      if (separator === -1) return false;
      return !isBlockedDeclaration(declaration.slice(0, separator));
    })
    .join('; ');
}

export function sanitizeContentHtml(html: string): string {
  if (!html) return '';

  const template = document.createElement('template');
  template.innerHTML = html;

  for (const element of Array.from(template.content.querySelectorAll('[style]'))) {
    const cleaned = sanitizeStyleAttribute(element.getAttribute('style') ?? '');
    if (cleaned) {
      element.setAttribute('style', cleaned);
    } else {
      element.removeAttribute('style');
    }
  }

  return template.innerHTML;
}
