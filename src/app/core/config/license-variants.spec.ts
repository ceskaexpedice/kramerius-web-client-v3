import {
  isLicenseVariant,
  splitLicenseVariants,
  resolveLicenseForSource,
  LicenseLike,
} from './license-variants';

// Minimálne tvary licencií — spec testuje čistú logiku, nie celý LicenseConfig.
type TestLicense = LicenseLike & { label?: { cs: string }; instructionPage?: { cs: string } };

const onsite: TestLicense = {
  id: 'onsite',
  label: { cs: 'Studovna' },
  instructionPage: { cs: 'onsite.cs.html' },
  actions: { print: true, text: true },
};

const onsiteMzk: TestLicense = {
  id: 'onsite__mzk',
  base: 'onsite',
  label: { cs: 'Studovna MZK' },
  instructionPage: { cs: 'onsite.mzk.cs.html' },
};

const dnntt: TestLicense = { id: 'dnntt', label: { cs: 'DNNT studovna' }, actions: { print: true } };

describe('isLicenseVariant', () => {
  it('treats a license with `base` as a variant', () => {
    expect(isLicenseVariant(onsiteMzk)).toBe(true);
  });

  it('treats a license without `base` as a base license', () => {
    expect(isLicenseVariant(onsite)).toBe(false);
  });
});

describe('splitLicenseVariants', () => {
  it('separates base licenses from variants', () => {
    const result = splitLicenseVariants([onsite, onsiteMzk, dnntt]);
    expect(result.base.map(l => l.id)).toEqual(['onsite', 'dnntt']);
    expect(result.variants.map(l => l.id)).toEqual(['onsite__mzk']);
  });

  it('returns empty variant list when none are configured', () => {
    const result = splitLicenseVariants([onsite, dnntt]);
    expect(result.variants).toEqual([]);
  });
});

describe('resolveLicenseForSource', () => {
  const all = [onsite, onsiteMzk, dnntt];

  it('returns the base license when no source is selected', () => {
    expect(resolveLicenseForSource(all, 'onsite', null)?.id).toBe('onsite');
  });

  it('returns the base license when the selected source has no variant', () => {
    expect(resolveLicenseForSource(all, 'onsite', 'nkp')?.id).toBe('onsite');
  });

  it('merges the variant over the base when the source matches', () => {
    const result = resolveLicenseForSource(all, 'onsite', 'mzk') as any;
    expect(result?.id).toBe('onsite__mzk');
    expect(result?.label).toEqual({ cs: 'Studovna MZK' });
    expect(result?.instructionPage).toEqual({ cs: 'onsite.mzk.cs.html' });
  });

  it('layers the variant actions on top of the base actions', () => {
    const variantWithActions = { ...onsiteMzk, actions: { pdf: true } };
    const result = resolveLicenseForSource([onsite, variantWithActions], 'onsite', 'mzk');
    // pdf comes from the variant, print/text survive from the base.
    expect(result?.actions).toEqual({ print: true, text: true, pdf: true });
  });

  it('lets the variant turn a base action off', () => {
    const variantWithActions = { ...onsiteMzk, actions: { print: false } };
    const result = resolveLicenseForSource([onsite, variantWithActions], 'onsite', 'mzk');
    expect(result?.actions).toEqual({ print: false, text: true });
  });

  it('keeps the base actions untouched when the variant omits actions', () => {
    // onsiteMzk defines no `actions`. The base's permissions must survive intact —
    // a variant that says nothing about actions must not silently revoke any.
    const result = resolveLicenseForSource([onsite, onsiteMzk], 'onsite', 'mzk');
    expect(result?.actions).toEqual({ print: true, text: true });
  });

  it('inherits base fields the variant does not override', () => {
    const sparse = { id: 'onsite__nkp', base: 'onsite', instructionPage: { cs: 'nkp.cs.html' } };
    const result = resolveLicenseForSource([onsite, sparse], 'onsite', 'nkp') as any;
    expect(result?.label).toEqual({ cs: 'Studovna' });
  });

  it('returns undefined when the base license does not exist', () => {
    expect(resolveLicenseForSource(all, 'nonexistent', 'mzk')).toBeUndefined();
  });

  it('ignores a variant whose base license is missing from the config', () => {
    const orphan = { id: 'ghost__mzk', base: 'ghost', label: { cs: 'x' } };
    expect(resolveLicenseForSource([onsite, orphan], 'ghost', 'mzk')).toBeUndefined();
  });

  it('never resolves a variant id as a base license', () => {
    expect(resolveLicenseForSource(all, 'onsite__mzk', 'mzk')).toBeUndefined();
  });

  it('ignores a variant whose id does not follow <base>__<source>', () => {
    const misnamed = { id: 'onsite-mzk', base: 'onsite', label: { cs: 'x' } };
    expect(resolveLicenseForSource([onsite, misnamed], 'onsite', 'mzk')?.id).toBe('onsite');
  });

  it('does not confuse a single-underscore api-style id with a variant', () => {
    // `mzk_public-contract` is a real base license id; it must stay resolvable.
    const contract = { id: 'mzk_public-contract', label: { cs: 'Smluvni' }, actions: {} };
    expect(resolveLicenseForSource([contract], 'mzk_public-contract', 'mzk')?.id)
      .toBe('mzk_public-contract');
  });
});
