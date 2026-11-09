#!/usr/bin/env node
/**
 * Guards every "Add to my library" (heart) button (#207).
 *
 * The heart only works when three pieces are wired in the same template:
 *   1. the button is shown        - <app-toolbar-controls [showFavorites]="true">
 *                                   or an own heart button calling a favorites handler
 *   2. its click is handled        - (favoritesClicked)="..." on that toolbar
 *   3. the popup is rendered       - <app-favorites-popup> (the click only flips
 *                                   the popup state; without the element nothing
 *                                   appears for a logged-in user)
 *
 * The multivolume page missed (3) and the collection page missed (2) + (3);
 * both looked fine and did nothing. This script fails when any template shows
 * a heart without the rest.
 *
 * Run: node scripts/check-favorites-wiring.js  (also runs before `npm run build`)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'src', 'app');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

/** Opening tags of an element, attributes included (may span lines). */
function openingTags(html, tagName) {
  const re = new RegExp(`<${tagName}\\b[^>]*>`, 'g');
  return html.match(re) ?? [];
}

/** Toolbar shows the heart unless showFavorites is absent or bound to a literal false. */
function toolbarShowsHeart(tag) {
  const m = tag.match(/\[showFavorites\]\s*=\s*"([^"]*)"/);
  return !!m && m[1].trim() !== 'false';
}

// Own heart buttons (record cards, track lists, queue) call one of these.
const HEART_HANDLER = /\(click\)\s*=\s*"[^"]*\b(onToggleFavorites|onFavoritesClicked|toggleFavorite\w*)\s*\(/;

const problems = [];
const templates = walk(ROOT).map(file => ({ file, html: fs.readFileSync(file, 'utf8') }));

/**
 * A child heart may delegate the click to its parent through a favorites
 * @Output (e.g. music-track-item -> music-track-list). That is fine when every
 * template using the child binds the output and renders the popup itself.
 */
function delegatesToParent(file, rel) {
  const ts = file.replace(/\.html$/, '.ts');
  if (!fs.existsSync(ts)) return false;
  const src = fs.readFileSync(ts, 'utf8');
  const output = src.match(/@Output\(\)\s+(\w*[Ff]avorit\w*)/)?.[1];
  // Element selector 'app-x' or attribute selector '[app-x]'.
  const sel = src.match(/selector:\s*'(\[?)([\w-]+)\]?'/);
  if (!output || !sel) return false;
  const [, isAttr, name] = sel;
  const usageTags = html => isAttr
    ? (html.match(new RegExp(`<[\\w-]+\\b[^>]*\\s${name}(?=[\\s>=/])[^>]*>`, 'g')) ?? [])
    : openingTags(html, name);
  const selector = isAttr ? `[${name}]` : name;

  const users = templates.filter(t => t.file !== file && usageTags(t.html).length);
  if (!users.length) return false;
  for (const user of users) {
    const userRel = path.relative(path.join(__dirname, '..'), user.file);
    const bound = usageTags(user.html).every(tag => new RegExp(`\\(${output}\\)\\s*=`).test(tag));
    if (!bound) problems.push(`${userRel} uses <${selector}> without binding (${output}) - its heart (${rel}) does nothing`);
    if (!/<app-favorites-popup\b/.test(user.html)) problems.push(`${userRel} handles (${output}) but never renders <app-favorites-popup>`);
  }
  return true;
}

for (const { file, html } of templates) {
  const rel = path.relative(path.join(__dirname, '..'), file);
  const rendersPopup = /<app-favorites-popup\b/.test(html);
  let showsHeart = false;

  for (const tag of openingTags(html, 'app-toolbar-controls')) {
    if (!toolbarShowsHeart(tag)) continue;
    showsHeart = true;
    if (!/\(favoritesClicked\)\s*=/.test(tag)) {
      const line = html.slice(0, html.indexOf(tag)).split('\n').length;
      problems.push(`${rel}:${line} toolbar shows the heart ([showFavorites]) but does not bind (favoritesClicked)`);
    }
  }

  if (HEART_HANDLER.test(html)) showsHeart = true;

  if (showsHeart && !rendersPopup && !delegatesToParent(file, rel)) {
    problems.push(`${rel} shows a heart button but never renders <app-favorites-popup>`);
  }
}

if (problems.length) {
  console.error('Favorites ("Add to my library") wiring check failed:\n');
  for (const p of problems) console.error('  - ' + p);
  console.error('\nSee scripts/check-favorites-wiring.js for what a working heart needs.');
  process.exit(1);
}
console.log('Favorites wiring check passed.');
