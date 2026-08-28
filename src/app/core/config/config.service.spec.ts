import { TestBed } from '@angular/core/testing';
import { ConfigService } from './config.service';
import { EnvironmentService } from '../../shared/services/environment.service';
import { CdkSourceService } from '../../shared/services/cdk-source.service';

/**
 * Guards the core invariant of source-scoped license variants: they are presentation
 * overrides only. They must never leak into the lists that drive search facets,
 * license ordering or access-type checks.
 */
describe('ConfigService license variants', () => {
  let service: ConfigService;

  const licensesConfig = [
    { id: 'public', accessType: 'open', isOnline: true, label: { cs: 'Volna' }, actions: {} },
    { id: 'onsite', accessType: 'terminal', isOnline: false, label: { cs: 'Studovna' }, actions: { print: true } },
    { id: 'onsite__mzk', base: 'onsite', label: { cs: 'Studovna MZK' } },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ConfigService, { provide: EnvironmentService, useValue: {} }],
    });
    service = TestBed.inject(ConfigService);
    // Seed the loaded config directly — this spec is about list filtering, not loading.
    // State lives in the private `config$` BehaviorSubject (config.service.ts:186);
    // `getConfig()` falls back to DEFAULT_CONFIG, which we spread to stay well-formed.
    (service as any).config$.next({ ...service.getConfig(), licenses: licensesConfig });
  });

  it('excludes variants from the public licenses list', () => {
    expect(service.licenses.map(l => l.id)).toEqual(['public', 'onsite']);
  });

  it('exposes variants through allLicenses', () => {
    expect(service.allLicenses.map(l => l.id)).toEqual(['public', 'onsite', 'onsite__mzk']);
  });

  it('excludes variants from terminal licenses (used by facets and filters)', () => {
    expect(service.getTerminalLicenses()).toEqual(['onsite']);
  });

  it('excludes variants from the license order', () => {
    expect(service.getLicenseOrder()).toEqual(['public', 'onsite']);
  });

  it('never returns an id containing the variant separator from list accessors', () => {
    const lists = [
      service.licenses.map(l => l.id),
      service.getTerminalLicenses(),
      service.getOnlineLicenses(),
      service.getOpenLicenses(),
      service.getAfterLoginLicenses(),
      service.getLicenseOrder(),
    ];
    for (const list of lists) {
      expect(list.some(id => id.includes('__'))).toBe(false);
    }
  });
});

describe('ConfigService source-scoped license resolution', () => {
  let service: ConfigService;
  let cdkSource: CdkSourceService;

  const licensesConfig = [
    {
      id: 'onsite',
      accessType: 'terminal',
      isOnline: false,
      label: { cs: 'Studovna', en: 'Reading room' },
      instructionPage: { cs: 'onsite.instruction.cs.html', en: 'onsite.instruction.en.html' },
      messagePages: [{ key: 'unauthenticated', page: { cs: 'onsite.cs.html' } }],
      actions: { print: true, text: true },
    },
    {
      id: 'onsite__mzk',
      base: 'onsite',
      label: { cs: 'Studovna MZK' },
      instructionPage: { cs: 'onsite.mzk.instruction.cs.html' },
      messagePages: [{ key: 'unauthenticated', page: { cs: 'onsite.mzk.cs.html' } }],
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ConfigService, CdkSourceService, { provide: EnvironmentService, useValue: {} }],
    });
    service = TestBed.inject(ConfigService);
    cdkSource = TestBed.inject(CdkSourceService);
    (service as any).config$.next({ ...service.getConfig(), licenses: licensesConfig });
  });

  it('returns the generic instruction page when no source is selected', () => {
    cdkSource.setCode(null);
    expect(service.getInstructionPageUrl('onsite', 'cs')).toBe('onsite.instruction.cs.html');
  });

  it('returns the source-scoped instruction page when a variant matches', () => {
    cdkSource.setCode('mzk');
    expect(service.getInstructionPageUrl('onsite', 'cs')).toBe('onsite.mzk.instruction.cs.html');
  });

  it('falls back to the generic instruction page for a source without a variant', () => {
    cdkSource.setCode('nkp');
    expect(service.getInstructionPageUrl('onsite', 'cs')).toBe('onsite.instruction.cs.html');
  });

  it('falls back through the language chain into the base license', () => {
    // The variant has no `en` instruction page, so the base license's `en` is used.
    cdkSource.setCode('mzk');
    expect(service.getInstructionPageUrl('onsite', 'en')).toBe('onsite.instruction.en.html');
  });

  it('returns the source-scoped label when a variant matches', () => {
    cdkSource.setCode('mzk');
    expect(service.getLocalizedLabel('license', 'onsite', 'cs')).toBe('Studovna MZK');
  });

  it('returns the generic label when no variant matches', () => {
    cdkSource.setCode('nkp');
    expect(service.getLocalizedLabel('license', 'onsite', 'cs')).toBe('Studovna');
  });

  it('ignoreSource=true returns the base label even when a source with a variant is selected', () => {
    cdkSource.setCode('mzk');
    expect(service.getLocalizedLabel('license', 'onsite', 'cs', true)).toBe('Studovna');
    // Sanity: without ignoreSource, the same call resolves the variant.
    expect(service.getLocalizedLabel('license', 'onsite', 'cs')).toBe('Studovna MZK');
  });

  it('returns the source-scoped message page when a variant matches', () => {
    cdkSource.setCode('mzk');
    expect(service.getMessagePageUrl('onsite', 'unauthenticated', 'cs')).toBe('onsite.mzk.cs.html');
  });

  it('returns the source-scoped config from getLicenseConfig', () => {
    cdkSource.setCode('mzk');
    expect(service.getLicenseConfig('onsite')?.label).toEqual({ cs: 'Studovna MZK' });
  });

  it('keeps the base actions when the active variant defines none', () => {
    // `onsite__mzk` declares no `actions`, so the base's permissions must survive.
    cdkSource.setCode('mzk');
    expect(service.getLicenseConfig('onsite')?.actions).toEqual(jasmine.objectContaining({ print: true, text: true }));
  });

  it('keeps isOnline and accessType from the base license even when the variant omits them', () => {
    // Regression test: processLicensesWithDefaults() used to force `isOnline` (and could
    // leave `accessType` undefined) onto every entry, including variants. Since resolution
    // merges as `{ ...base, ...variant }`, an unset/forced field on the variant would
    // override the base's real value — e.g. reporting a terminal license as online.
    cdkSource.setCode('mzk');
    const resolved = service.getLicenseConfig('onsite');
    expect(resolved?.isOnline).toBe(false);
    expect(resolved?.accessType).toBe('terminal');
  });

  it('layers a variant\'s own actions over the base license', () => {
    (service as any).config$.next({
      ...service.getConfig(),
      licenses: [
        licensesConfig[0],
        { ...licensesConfig[1], actions: { pdf: true, print: false } },
      ],
    });
    cdkSource.setCode('mzk');
    const actions = service.getLicenseConfig('onsite')?.actions;
    expect(actions).toEqual(jasmine.objectContaining({
      pdf: true,     // added by the variant
      print: false,  // turned off by the variant
      text: true,    // survives from the base
    }));
  });
});

/**
 * Guards the loader-side half of the "variants layer their actions" contract.
 *
 * `processLicensesWithDefaults` seeds every ordinary license with `_defaults.actions`.
 * It must NOT do that for variants: since the resolver layers a variant's actions on
 * top of the base's, a variant pre-filled with the (typically restrictive) defaults
 * would present them as deliberate overrides and silently strip the base's permissions
 * from every variant that did not restate them.
 */
describe('ConfigService variant defaults seeding', () => {
  let service: ConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ConfigService, CdkSourceService, { provide: EnvironmentService, useValue: {} }],
    });
    service = TestBed.inject(ConfigService);
  });

  it('does not seed _defaults.actions into variants', () => {
    const processed = (service as any).processLicensesWithDefaults({
      _defaults: { actions: { pdf: false, print: false, text: false } },
      licenses: [
        { id: 'onsite', accessType: 'terminal', label: { cs: 'Studovna' }, actions: { print: true, text: true } },
        { id: 'onsite__mzk', base: 'onsite', label: { cs: 'Studovna MZK' } },
      ],
    });

    const base = processed.find((l: any) => l.id === 'onsite');
    const variant = processed.find((l: any) => l.id === 'onsite__mzk');

    // The base license still gets the defaults merged under its own actions.
    expect(base.actions).toEqual({ pdf: false, print: true, text: true });
    // The variant carries no actions at all, so the base's survive resolution.
    expect(variant.actions).toBeUndefined();
  });
});

/**
 * Regression coverage for a lookup-order bug found in review: the language-chain
 * fallback must exhaust the VARIANT across the whole chain before ever consulting
 * the base license, not interleave "variant then base" at each language in turn.
 *
 * Counterexample: variant has only `en`, base has both `cs` and `en`. Requesting
 * `cs` (chain ['cs', 'en'] per LANG_FALLBACK_CHAIN) must still return the variant's
 * `en` text — the library-specific text — rather than the base's generic `cs` text,
 * because a source-scoped variant exists specifically to override the base's texts;
 * the base is a last resort only once the variant has nothing left in ANY language.
 */
describe('ConfigService source-scoped license resolution — language-chain fallback order', () => {
  let service: ConfigService;
  let cdkSource: CdkSourceService;

  const licensesConfig = [
    {
      id: 'onsite',
      accessType: 'terminal',
      isOnline: false,
      label: { cs: 'Studovna', en: 'Reading room' },
      instructionPage: { cs: 'base-cs.html', en: 'base-en.html' },
      messagePages: [{ key: 'unauthenticated', page: { cs: 'base-message-cs.html', en: 'base-message-en.html' } }],
      actions: { print: true, text: true },
    },
    {
      id: 'onsite__mzk',
      base: 'onsite',
      label: { cs: 'Studovna MZK' },
      instructionPage: { en: 'variant-en.html' },
      messagePages: [{ key: 'unauthenticated', page: { en: 'variant-message-en.html' } }],
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ConfigService, CdkSourceService, { provide: EnvironmentService, useValue: {} }],
    });
    service = TestBed.inject(ConfigService);
    cdkSource = TestBed.inject(CdkSourceService);
    (service as any).config$.next({ ...service.getConfig(), licenses: licensesConfig });
    cdkSource.setCode('mzk');
  });

  it('prefers the variant text in a non-requested language over the base text in the requested language (instruction page)', () => {
    expect(service.getInstructionPageUrl('onsite', 'cs')).toBe('variant-en.html');
  });

  it('prefers the variant text in a non-requested language over the base text in the requested language (message page)', () => {
    expect(service.getMessagePageUrl('onsite', 'unauthenticated', 'cs')).toBe('variant-message-en.html');
  });
});

/**
 * Whole-document PDF and EPUB are produced by the backend "public worker", which
 * currently runs only at KNAV and NKP (decision of 2026-08-27).
 *
 * The deciding factor is the library that SERVES the document, not the instance the
 * user is on: on CDK `app.code` is always `cdk`, and the aggregated document is
 * fetched from the selected `cdk.collection` member — that member's backend is the
 * one that would have to produce the export. Off CDK no source is set and the
 * instance's own code decides.
 */
describe('ConfigService public-worker export gate', () => {
  function serviceFor(
    opts: { source?: string | null; krameriusId?: string; exportConfig?: Record<string, boolean> },
  ) {
    const { source = null, krameriusId = 'cdk' } = opts;
    const exportConfig = opts.exportConfig ?? { print: true, jpeg: true, pdf: true, epub: true, txt: true };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ConfigService,
        CdkSourceService,
        {
          provide: EnvironmentService,
          useValue: { getKrameriusId: () => krameriusId, isLibrarySwitchEnabled: () => true },
        },
      ],
    });
    const service = TestBed.inject(ConfigService);
    TestBed.inject(CdkSourceService).setCode(source);
    (service as any).config$.next({
      ...service.getConfig(),
      app: { ...service.getConfig().app, code: krameriusId },
      export: exportConfig,
    });
    return service;
  }

  it('allows pdf and epub when the selected CDK source is knav', () => {
    const service = serviceFor({ source: 'knav' });
    expect(service.isExportFormatEnabled('pdf')).toBe(true);
    expect(service.isExportFormatEnabled('epub')).toBe(true);
  });

  it('allows pdf and epub when the selected CDK source is nkp', () => {
    const service = serviceFor({ source: 'nkp' });
    expect(service.isExportFormatEnabled('pdf')).toBe(true);
    expect(service.isExportFormatEnabled('epub')).toBe(true);
  });

  it('blocks pdf and epub when the selected CDK source has no public worker', () => {
    const service = serviceFor({ source: 'mzk' });
    expect(service.isExportFormatEnabled('pdf')).toBe(false);
    expect(service.isExportFormatEnabled('epub')).toBe(false);
  });

  it('reflects a source switch: mzk blocks, switching to knav allows', () => {
    const service = serviceFor({ source: 'mzk' });
    expect(service.isExportFormatEnabled('pdf')).toBe(false);
    TestBed.inject(CdkSourceService).setCode('knav');
    expect(service.isExportFormatEnabled('pdf')).toBe(true);
  });

  it('blocks pdf and epub on the cdk aggregator when no source is selected', () => {
    // app.code is `cdk` there, which is not a public-worker library.
    const service = serviceFor({ source: null });
    expect(service.isExportFormatEnabled('pdf')).toBe(false);
  });

  it('falls back to the instance code off CDK, where no source is ever set', () => {
    const knav = serviceFor({ source: null, krameriusId: 'knav' });
    expect(knav.isExportFormatEnabled('pdf')).toBe(true);

    const mzk = serviceFor({ source: null, krameriusId: 'mzk' });
    expect(mzk.isExportFormatEnabled('pdf')).toBe(false);
  });

  it('leaves the other export formats untouched by the gate', () => {
    const service = serviceFor({ source: 'mzk' });
    expect(service.isExportFormatEnabled('print')).toBe(true);
    expect(service.isExportFormatEnabled('jpeg')).toBe(true);
    expect(service.isExportFormatEnabled('txt')).toBe(true);
  });

  it('still lets config disable pdf on a public-worker library', () => {
    // The gate only ever subtracts: config remains authoritative for turning off.
    const service = serviceFor({ source: 'knav', exportConfig: { pdf: false, epub: true, print: true, jpeg: true, txt: true } });
    expect(service.isExportFormatEnabled('pdf')).toBe(false);
    expect(service.isExportFormatEnabled('epub')).toBe(true);
  });

  it('hides the export tab when the gate removes the only configured formats', () => {
    const service = serviceFor({
      source: 'mzk',
      exportConfig: { print: false, jpeg: false, txt: false, pdf: true, epub: true },
    });
    expect(service.isAnyExportFormatEnabled()).toBe(false);
  });
});
