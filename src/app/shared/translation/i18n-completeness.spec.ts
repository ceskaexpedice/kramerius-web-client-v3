/**
 * Guards the translation bundles: every language advertised to users must have
 * the same key set as the Czech source, and interpolation placeholders must
 * survive translation. A missing key silently falls back to another language;
 * a mangled `{{placeholder}}` renders as literal text in the UI.
 *
 * The bundles are static assets, so they are fetched the same way the app
 * fetches them at runtime.
 */

// Marks this file as a module: spec files share one global scope in the
// Karma bundle, so top-level declarations here would otherwise collide
// with same-named ones in other specs.
export {};

const NAMESPACES = [
  '', 'access_denied', 'codetables', 'constants', 'languages',
  'physical_locations', 'relators', 'shared', 'source',
];

/**
 * Languages generated with full key parity against `cs`. The original
 * bundles (en/sk/pl) predate this spec and still carry known gaps — for example
 * `terms.agreement` is absent from sk and pl, `archive-short` from en and pl —
 * so they are checked for placeholder and empty-value integrity only, below.
 */
const COMPLETE_LANGUAGES = ['de', 'et', 'hu', 'lt', 'pt', 'sl', 'sv', 'zh-CN', 'zh-TW'];

/** Every language shipped to users, complete or not. */
const ALL_LANGUAGES = ['en', 'sk', 'pl', ...COMPLETE_LANGUAGES];

const PLACEHOLDER = /\{\{\s*\w+\s*\}\}|%\w+%/g;

function url(ns: string, lang: string): string {
  return ns ? `/i18n/${ns}/${lang}.json` : `/i18n/${lang}.json`;
}

async function load(ns: string, lang: string): Promise<Record<string, string>> {
  const res = await fetch(url(ns, lang));
  if (!res.ok) throw new Error(`missing bundle ${url(ns, lang)}`);
  return res.json();
}

describe('i18n bundle completeness', () => {
  NAMESPACES.forEach(ns => {
    COMPLETE_LANGUAGES.forEach(lang => {
      it(`${ns || 'main'}/${lang} has the same keys as cs`, async () => {
        const cs = await load(ns, 'cs');
        const target = await load(ns, lang);
        const missing = Object.keys(cs).filter(k => !(k in target));
        const extra = Object.keys(target).filter(k => !(k in cs));
        expect(missing).toEqual([]);
        expect(extra).toEqual([]);
      });
    });

    ALL_LANGUAGES.forEach(lang => {
      it(`${ns || 'main'}/${lang} preserves interpolation placeholders`, async () => {
        const cs = await load(ns, 'cs');
        const target = await load(ns, lang);
        const broken: string[] = [];
        for (const [key, source] of Object.entries(cs)) {
          const translated = target[key];
          if (typeof source !== 'string' || typeof translated !== 'string') continue;
          const a = (source.match(PLACEHOLDER) ?? []).slice().sort();
          const b = (translated.match(PLACEHOLDER) ?? []).slice().sort();
          if (a.join('|') !== b.join('|')) broken.push(key);
        }
        expect(broken).toEqual([]);
      });

      it(`${ns || 'main'}/${lang} has no empty values`, async () => {
        const target = await load(ns, lang);
        const empty = Object.entries(target)
          .filter(([, v]) => typeof v === 'string' && !v.trim())
          .map(([k]) => k);
        expect(empty).toEqual([]);
      });
    });
  });
});
