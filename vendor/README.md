# Vendored packages

Prebuilt third-party / sibling packages copied into this repo so installs don't
depend on paths outside the repository.

## `@allmaps/viewer-lite`

- **Source**: `georeference-allmaps/app/allmaps/packages/viewer-lite` (sibling
  monorepo on the maintainer's machine).
- **What's vendored**: the prebuilt `dist/` artifact + a trimmed `package.json`.
  Source files, build config, and `node_modules/` are intentionally not copied.
- **Why deps were stripped from the vendored `package.json`**: `dist/index.js`
  is a fully Vite-bundled single file (~2 MB) with no bare external imports —
  `ol`, `@allmaps/annotation`, `@allmaps/openlayers`, `@allmaps/stdlib`, and
  `@allmaps/types` are all inlined. Listing them as `dependencies` would force
  npm to resolve `workspace:^` specs that don't exist outside the upstream
  monorepo.

### Refresh procedure

When the upstream package changes:

1. In the upstream repo, rebuild:
   ```
   cd .../georeference-allmaps/app/allmaps/packages/viewer-lite
   npm run build
   ```
2. Replace the vendored `dist/`:
   ```
   rm -rf vendor/@allmaps/viewer-lite/dist
   cp -R .../viewer-lite/dist vendor/@allmaps/viewer-lite/
   ```
3. If the upstream `package.json` changes its `exports`/`types` shape, mirror
   that change in `vendor/@allmaps/viewer-lite/package.json` (but keep
   `dependencies`/`devDependencies`/`scripts` removed).
4. Reinstall: `npm install` to refresh `package-lock.json`.

### Long-term

This is a stop-gap. Once `@allmaps/viewer-lite` stabilizes, prefer publishing it
to a registry (npm or a private one) or pinning a git URL with a commit SHA.
