/**
 * Source-scoped license variants.
 *
 * CDK aggregates many member libraries, so an on-site ("terminal") license must be
 * able to say *where* the reader can physically find the document — and that text
 * differs per library. A variant is a partial override of a base license, tied to
 * one member library:
 *
 *   { "id": "onsite__mzk", "base": "onsite", "instructionPage": { ... } }
 *
 * The separator is doubled on purpose: `cdk.licenses` from the API uses a single
 * underscore (`<collection>_<license>`, e.g. `nkp_onsite`), and existing license
 * ids contain single underscores too (`mzk_public-contract`). Doubling keeps the
 * two namespaces from colliding.
 */

// Visually similar to, but unrelated to, `ALL_SOURCES = '__all__'`
// (src/app/shared/utils/cdk-source.constants.ts:7). They never actually meet —
// ALL_SOURCES is never written into CdkSourceService — but a source literally
// named `all` would render as `onsite__all`.
export const VARIANT_SEPARATOR = '__';

export type LicenseLike = { id: string; base?: string; actions?: unknown };

/**
 * Whether the metadata sidebar's "Dostupnost" row should be shown.
 *
 * A watermarked license (e.g. `mzk_public-muo` — Hudebniny Kroměříž) is
 * `accessType: open`, so the badge collapses it to the generic "Volná díla".
 * That overstates the rights: the scans may only be read under the protective
 * overlay, so calling them free works contradicts the overlay drawn over the
 * very same page. Where a watermark applies we drop the row instead.
 *
 * Locked documents always keep the row — there it states a real restriction.
 */
export function shouldShowAccessibility(isPublic: boolean, hasWatermark: boolean): boolean {
  return !isPublic || !hasWatermark;
}

/** True when the license is a per-source override rather than a standalone license. */
export function isLicenseVariant(license: { base?: string }): boolean {
  return !!license.base;
}

/**
 * Splits a license list into standalone (base) licenses and per-source variants.
 * Everything outside the variant resolution — facets, license ordering, filters —
 * must only ever see the `base` half.
 */
export function splitLicenseVariants<T extends { base?: string }>(
  licenses: T[],
): { base: T[]; variants: T[] } {
  const base: T[] = [];
  const variants: T[] = [];
  for (const license of licenses) {
    (isLicenseVariant(license) ? variants : base).push(license);
  }
  return { base, variants };
}

/**
 * Resolves a license to its variant for the given CDK source, falling back to the
 * base license whenever no source is selected or no variant matches.
 *
 * `actions` are layered rather than replaced: the base license's actions form the
 * floor and the variant overrides individual flags on top. A variant that omits
 * `actions` therefore keeps the base's permissions untouched — which is why
 * variants must NOT be pre-filled with `_defaults.actions` when the config is
 * loaded (see `processLicensesWithDefaults`), or those defaults would masquerade
 * as deliberate overrides and silently strip the base's permissions.
 */
export function resolveLicenseForSource<T extends LicenseLike>(
  licenses: T[],
  licenseId: string,
  source: string | null | undefined,
): T | undefined {
  const base = licenses.find(l => l.id === licenseId && !isLicenseVariant(l));
  if (!base || !source) return base;

  const variantId = `${licenseId}${VARIANT_SEPARATOR}${source}`;
  const variant = licenses.find(l => l.id === variantId && l.base === licenseId);
  if (!variant) return base;

  return {
    ...base,
    ...variant,
    actions: { ...(base.actions as object), ...(variant.actions as object) },
  };
}
