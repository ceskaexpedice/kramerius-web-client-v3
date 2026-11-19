#!/usr/bin/env node
// Adds <link rel="modulepreload"> for every chunk statically imported by the
// initial bundle (main + polyfills, transitively).
//
// The Angular application builder emits at most 10 modulepreload hints
// (MODULE_PRELOAD_MAX in @angular/build index-html-generator). The initial
// bundle has ~50 chunks, so the rest were only discovered after main.js and
// its first imports had downloaded and parsed — one more round trip before the
// app could boot (visible as a second "wave" of chunk requests).
//
// Runs as part of `postbuild`. Idempotent: links already present are skipped.
//
// Usage: node scripts/add-modulepreload.js [outputDir]
//   outputDir defaults to the browser build output from angular.json.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function defaultOutputDir() {
  const angular = JSON.parse(fs.readFileSync(path.join(ROOT, 'angular.json'), 'utf8'));
  const project = Object.values(angular.projects)[0];
  const outputPath = project.architect.build.options.outputPath;
  const base = typeof outputPath === 'string' ? outputPath : outputPath.base;
  return path.join(ROOT, base, 'browser');
}

// Static ESM imports in esbuild output: `from"./chunk-X.js"` and bare
// `import"./chunk-X.js"`. Dynamic `import("./chunk-X.js")` is excluded on
// purpose — those are lazy routes/components.
const STATIC_IMPORT = /(?:\bfrom\s*|\bimport\s*)["']\.\/([\w.-]+\.js)["']/g;

function staticImports(dir, file) {
  const code = fs.readFileSync(path.join(dir, file), 'utf8');
  const found = new Set();
  for (const m of code.matchAll(STATIC_IMPORT)) found.add(m[1]);
  return found;
}

function main() {
  const dir = path.resolve(process.argv[2] || defaultOutputDir());
  const indexPath = path.join(dir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error(`[add-modulepreload] ❌ ${indexPath} not found`);
    process.exit(1);
  }
  let html = fs.readFileSync(indexPath, 'utf8');

  const entries = [...html.matchAll(/<script[^>]+src="([\w.-]+\.js)"[^>]*type="module"/g)].map(m => m[1]);
  if (!entries.length) {
    console.error('[add-modulepreload] ❌ no module entry scripts in index.html');
    process.exit(1);
  }

  // Transitive closure of static imports from the entry scripts.
  const closure = new Set();
  const queue = [...entries];
  while (queue.length) {
    const file = queue.pop();
    for (const dep of staticImports(dir, file)) {
      if (closure.has(dep) || entries.includes(dep)) continue;
      if (!fs.existsSync(path.join(dir, dep))) {
        console.error(`[add-modulepreload] ❌ ${file} imports missing ${dep}`);
        process.exit(1);
      }
      closure.add(dep);
      queue.push(dep);
    }
  }

  const existing = new Set([...html.matchAll(/<link rel="modulepreload" href="([^"]+)"/g)].map(m => m[1]));
  const missing = [...closure].filter(f => !existing.has(f)).sort();
  if (!missing.length) {
    console.log(`[add-modulepreload] ✅ all ${closure.size} initial chunks already preloaded`);
    return;
  }

  const links = missing.map(f => `<link rel="modulepreload" href="${f}">`).join('');
  // Next to Angular's own hints when present, else before the first entry script.
  const lastLink = html.lastIndexOf('<link rel="modulepreload"');
  if (lastLink !== -1) {
    const end = html.indexOf('>', lastLink) + 1;
    html = html.slice(0, end) + links + html.slice(end);
  } else {
    const firstScript = html.search(/<script[^>]+type="module"/);
    html = html.slice(0, firstScript) + links + html.slice(firstScript);
  }
  fs.writeFileSync(indexPath, html);
  console.log(`[add-modulepreload] ✅ +${missing.length} modulepreload (${existing.size} → ${existing.size + missing.length} of ${closure.size} initial chunks)`);
}

main();
