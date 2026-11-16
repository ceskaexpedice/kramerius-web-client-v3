// Merges the per-namespace translation files of every language into a single
// file per language, so the browser loads 1 file per language instead of 9.
//
//   public/i18n/relators/cs.json, public/i18n/languages/cs.json, …, public/i18n/cs.json
//     → <build output>/i18n/bundle/cs.json
//
// Runs after `ng build` (npm "postbuild") and writes straight into the build
// output — nothing generated lands in the source tree, and `ng serve` keeps
// loading the source files (the app only uses the bundle in production builds,
// and falls back to the individual files when the bundle is missing).
//
// The merge must match what MultiTranslateHttpLoader does at runtime (see
// src/app/shared/translation/translate-http-loader.ts): the same namespace
// order, ngx-translate's mergeDeep semantics, and `{}` for a missing file.
//
// Usage: node scripts/bundle-i18n.js [outputDir]
//   outputDir defaults to the browser build output from angular.json.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SOURCE_DIR = path.join(ROOT, 'public', 'i18n');

// Keep in sync with I18N_NAMESPACES in translate-http-loader.ts ('' = root).
const NAMESPACES = [
  'relators',
  'languages',
  'constants',
  'codetables',
  'shared',
  'physical_locations',
  'source',
  'access_denied',
  '',
];

function defaultOutputDir() {
  const angular = JSON.parse(fs.readFileSync(path.join(ROOT, 'angular.json'), 'utf8'));
  const project = Object.values(angular.projects)[0];
  const outputPath = project.architect.build.options.outputPath;
  const base = typeof outputPath === 'string' ? outputPath : outputPath.base;
  return path.join(ROOT, base, 'browser');
}

// --- ngx-translate's mergeDeep (@ngx-translate/core), ported 1:1 -----------
const isObject = v => typeof v === 'object' && v !== null;
const isDict = v => isObject(v) && !Array.isArray(v);
function cloneDeep(value) {
  if (Array.isArray(value)) return value.map(cloneDeep);
  if (isDict(value)) {
    const out = {};
    Object.keys(value).forEach(k => { out[k] = cloneDeep(value[k]); });
    return out;
  }
  return value;
}
function mergeDeep(target, source) {
  if (!isObject(target)) return cloneDeep(source);
  const output = cloneDeep(target);
  if (isObject(output) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isDict(source[key])) {
        if (key in target) {
          output[key] = mergeDeep(target[key], source[key]);
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}
// ---------------------------------------------------------------------------

function readNamespace(ns, lang) {
  const file = path.join(SOURCE_DIR, ns, `${lang}.json`);
  if (!fs.existsSync(file)) return {}; // the runtime loader also uses {} for a missing file
  // A broken JSON must fail the build rather than ship a language without it.
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function main() {
  const outputDir = path.resolve(process.argv[2] || defaultOutputDir());
  if (!fs.existsSync(outputDir)) {
    console.error(`[bundle-i18n] ❌ Build output not found: ${outputDir}`);
    process.exit(1);
  }

  // Languages = the root-level files (public/i18n/<lang>.json).
  const languages = fs.readdirSync(SOURCE_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => f.slice(0, -'.json'.length));

  const targetDir = path.join(outputDir, 'i18n', 'bundle');
  fs.mkdirSync(targetDir, { recursive: true });

  let total = 0;
  for (const lang of languages) {
    const merged = NAMESPACES.reduce((acc, ns) => mergeDeep(acc, readNamespace(ns, lang)), {});
    const json = JSON.stringify(merged);
    fs.writeFileSync(path.join(targetDir, `${lang}.json`), json);
    total += json.length;
  }
  console.log(`[bundle-i18n] ✅ ${languages.length} languages → ${path.relative(ROOT, targetDir)} (${Math.round(total / 1024)} kB)`);
}

main();
