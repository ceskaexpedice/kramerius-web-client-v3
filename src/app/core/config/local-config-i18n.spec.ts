/**
 * Guards the localized blocks in `public/local-config`. Unlike the i18n
 * bundles, these live inside the config files: every `{ cs, en, … }`
 * map must cover the languages listed below, and every entry that points at an
 * HTML content page must point at a file that exists — a missing file renders
 * as an empty page rather than an error, so it fails silently in production.
 */

// Marks this file as a module: spec files share one global scope in the
// Karma bundle, so top-level declarations here would otherwise collide
// with same-named ones in other specs.
export {};

const CONFIG_FILES = [
  '/local-config/config-main.json',
  '/local-config/config-homepage.json',
  '/local-config/config-licenses.json',
];

/**
 * Languages every localized block must carry. `sk`/`pl` are deliberately not
 * required: 20 blocks in config-main/config-licenses (license labels and the
 * HTML content pages) have only ever carried `cs`/`en`, and those languages
 * resolve through the fallback chain (sk → cs → en). German was added
 * everywhere, so it is required here to keep that coverage from regressing.
 */
const EXPECTED = ['cs', 'en', 'de'];

/**
 * Every code that may appear as a key of a localized block. Deliberately a
 * superset of EXPECTED: a block is recognised by *all* of its keys being
 * language codes, so codes that are merely present (sk, pl) must be listed
 * here or the block is not detected at all.
 */
const LANG_KEYS = new Set([
  'cs', 'en', 'sk', 'pl', 'de', 'et', 'hu', 'lt', 'pt', 'sl', 'sv', 'zh-CN', 'zh-TW',
]);

type Block = Record<string, string | string[]>;

/** Collects every dict whose keys are all language codes. */
function collect(node: unknown, path: string, out: { path: string; block: Block }[]): void {
  if (Array.isArray(node)) {
    node.forEach((v, i) => collect(v, `${path}[${i}]`, out));
    return;
  }
  if (node && typeof node === 'object') {
    const keys = Object.keys(node as object);
    if (keys.length && keys.every(k => LANG_KEYS.has(k))) {
      out.push({ path, block: node as Block });
      return;
    }
    for (const [k, v] of Object.entries(node as object)) {
      collect(v, path ? `${path}.${k}` : k, out);
    }
  }
}

async function blocksOf(file: string) {
  const res = await fetch(file);
  if (!res.ok) throw new Error(`${file} -> HTTP ${res.status}`);
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`${file} -> not JSON (${text.slice(0, 80)})`);
  }
  const out: { path: string; block: Block }[] = [];
  collect(parsed, '', out);
  return out;
}

describe('local-config localized blocks', () => {
  CONFIG_FILES.forEach(file => {
    it(`${file} covers every advertised language`, async () => {
      const blocks = await blocksOf(file);
      expect(blocks.length).toBeGreaterThan(0);
      const gaps = blocks
        .filter(b => EXPECTED.some(l => !(l in b.block)))
        .map(b => `${b.path}: missing ${EXPECTED.filter(l => !(l in b.block)).join(',')}`);
      expect(gaps).toEqual([]);
    });

    it(`${file} references content pages that exist`, async () => {
      const blocks = await blocksOf(file);
      const refs: string[] = [];
      for (const { block } of blocks) {
        for (const value of Object.values(block)) {
          for (const item of Array.isArray(value) ? value : [value]) {
            if (typeof item === 'string' && item.endsWith('.html')) refs.push(item);
          }
        }
      }
      const missing: string[] = [];
      for (const ref of refs) {
        const res = await fetch(ref.startsWith('/') ? ref : `/${ref}`);
        if (!res.ok) missing.push(ref);
      }
      expect(missing).toEqual([]);
    });
  });
});
