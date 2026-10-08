import { BehaviorSubject, skip } from 'rxjs';
import { DocumentAccessDenied } from './document-access-denied';

/**
 * `licenseLabel()` is pure string logic over two collaborators, so it is exercised
 * directly on the prototype rather than through a full TestBed component fixture.
 */
describe('DocumentAccessDenied.licenseLabel', () => {
  /**
   * `sourceScopedLabel` is what `getLocalizedLabel('license', key, lang)` returns
   * (source-scoped: may be a variant's label). `baseLabel` is what
   * `getLocalizedLabel('license', key, lang, true)` returns (ignoreSource: always the
   * base license's label). Defaults to the same value as `sourceScopedLabel` so tests
   * that don't care about the variant distinction get "no variant in play" for free.
   */
  function makeComponent(
    sourceScopedLabel: string,
    translations: Record<string, string> = {},
    baseLabel: string = sourceScopedLabel,
  ) {
    const component = Object.create(DocumentAccessDenied.prototype) as DocumentAccessDenied;
    (component as any).configService = {
      getLocalizedLabel: (_type: string, key: string, _lang: string, ignoreSource = false) =>
        (ignoreSource ? baseLabel : sourceScopedLabel) || key,
    };
    (component as any).translationService = { currentLanguage: () => ({ code: 'cs' }) };
    (component as any).translate = {
      instant: (key: string) => translations[key] ?? key,
    };
    return component;
  }

  it('uses the i18n label, not the config label, when no variant is in play (regression test)', () => {
    // Source-scoped and base config labels are identical here (no variant), but they
    // differ materially from the i18n label — exactly the standalone-MZK scenario from
    // the review: config label must NOT win when there is no variant to justify it.
    const component = makeComponent('Díla nedostupná na trhu - online', {
      'access-denied.license-dnnto': 'Díla nedostupná na trhu',
    });
    expect(component.licenseLabel('dnnto')).toBe('Díla nedostupná na trhu');
  });

  it('prefers the source-scoped config label when a variant is in play', () => {
    // Source-scoped label differs from the base label → a variant applies → config wins.
    const component = makeComponent('Studovna MZK', { 'access-denied.license-onsite': 'Studovna' }, 'Studovna');
    expect(component.licenseLabel('onsite')).toBe('Studovna MZK');
  });

  it('falls back to the translation key when the config has no label', () => {
    // getLocalizedLabel returns the key itself when nothing is configured.
    const component = makeComponent('', { 'access-denied.license-onsite': 'Studovna' });
    expect(component.licenseLabel('onsite')).toBe('Studovna');
  });

  it('returns the translation key itself when neither source has a label', () => {
    const component = makeComponent('');
    expect(component.licenseLabel('onsite')).toBe('access-denied.license-onsite');
  });
});

/**
 * The constructor wires `cdkSource.code$.pipe(skip(1), takeUntilDestroyed(...))` to
 * `loadHtmlContent()`, to avoid a redundant HTTP round trip: `code$` is a
 * BehaviorSubject that replays its current value synchronously on subscribe, and the
 * language `effect()` already performs the first load, so that initial replay must be
 * skipped and only real source changes should trigger a reload.
 *
 * The constructor itself can't be exercised meaningfully through the
 * `Object.create(prototype)` approach used above (it is never invoked, and
 * `CdkSourceService`/`DestroyRef` aren't real injected instances there), so this test
 * verifies the `skip(1)` behaviour directly against a real `BehaviorSubject` piped the
 * same way the constructor pipes `code$`, with a spy standing in for `loadHtmlContent`.
 */
describe('DocumentAccessDenied code$ subscription behaviour (skip(1))', () => {
  it('does not invoke the reload for the replayed seed value, only for subsequent emissions', () => {
    const code$ = new BehaviorSubject<string | null>(null);
    const reload = jasmine.createSpy('loadHtmlContent');

    code$.pipe(skip(1)).subscribe(() => reload());

    // Synchronous replay of the seeded value on subscribe must not trigger a reload.
    expect(reload).not.toHaveBeenCalled();

    // A genuine source change must trigger a reload.
    code$.next('mzk');
    expect(reload).toHaveBeenCalledTimes(1);

    code$.next('nkp');
    expect(reload).toHaveBeenCalledTimes(2);
  });
});

/**
 * Regression coverage for the bug this feature was reported against: the license
 * info dialog on the access-denied screen used to read STATIC translation keys
 * (`access-denied.dialog.<type>.content`, where `getType()` collapses everything
 * except dnnto/dnntt to `other`). It never consulted config at all, so the main
 * license text stayed identical for every library — the source-scoped
 * `messagePages` of `onsite__mzk` / `onsite__nkp` could never reach the screen,
 * even though `instructionPage` (which does go through ConfigService) worked.
 */
describe('DocumentAccessDenied.openLicenseDialog', () => {
  function makeComponent(messagePageUrl: string | null, html: string) {
    const component = Object.create(DocumentAccessDenied.prototype) as DocumentAccessDenied;
    const opened: any[] = [];
    (component as any).configService = {
      getMessagePageUrl: () => messagePageUrl,
      loadHtmlContent: () => Promise.resolve(html),
      getLocalizedLabel: (_t: string, key: string) => key,
    };
    (component as any).translationService = { currentLanguage: () => ({ code: 'cs' }) };
    (component as any).translate = { instant: (key: string) => key };
    (component as any).dialog = { open: (_c: unknown, cfg: any) => { opened.push(cfg.data); } };
    return { component, opened };
  }

  it('shows the license description from config instead of the static translation key', async () => {
    const { component, opened } = makeComponent('licence_onsite_mzk.cs.html', '<p>MZK text</p>');

    await component.openLicenseDialog('onsite');

    expect(opened.length).toBe(1);
    expect(opened[0].content).toBe('<p>MZK text</p>');
    expect(opened[0].raw).toBe(true);
    // The old behaviour passed a translation key; it must not come back.
    expect(opened[0].content).not.toBe('access-denied.dialog.other.content');
  });

  it('falls back to the translation keys when no message page is configured', async () => {
    const { component, opened } = makeComponent(null, '');

    await component.openLicenseDialog('onsite');

    expect(opened.length).toBe(1);
    expect(opened[0].content).toBe('access-denied.dialog.other.content');
    expect(opened[0].raw).toBeUndefined();
  });

  it('falls back to the translation keys when the configured page loads empty', async () => {
    const { component, opened } = makeComponent('licence_onsite.cs.html', '');

    await component.openLicenseDialog('onsite');

    expect(opened[0].content).toBe('access-denied.dialog.other.content');
  });
});

/**
 * Regression coverage for a document carrying a license that is not defined in
 * `config-licenses.json` (seen in the wild: `[dnnto, onsite, covid]`). Two things
 * went wrong on the access-denied screen:
 *
 *  1. The undefined license was listed anyway, and since it has neither a config
 *     label nor an `access-denied.license-<id>` translation, it rendered as the raw
 *     key `access-denied.license-covid`. Facets already filter license values down
 *     to `getConfiguredLicenses()` (see `facet-utils`); this screen must do the same.
 *  2. Only the *primary* license's instruction page was shown, so a document that is
 *     both dnnto and onsite explained just the dnnto route ("log in with a partner
 *     library account") and never mentioned the reading-room requirement.
 *
 * The instructions are now keyed off the detected license list itself (previously a
 * separate `requiredLicenses` input carrying the page's runtime `providedByLicenses`,
 * which could name a license absent from the list on screen), so the list and the text
 * below it can no longer disagree.
 */
describe('DocumentAccessDenied license filtering and instructions', () => {
  function makeComponent(options: {
    documentLicenses?: string[];
    configuredLicenses?: string[];
    instructionPages?: Record<string, string>;
    htmlByUrl?: Record<string, string>;
  }) {
    const {
      documentLicenses = [],
      configuredLicenses = ['public', 'dnnto', 'dnntt', 'onsite', 'onsite-sheetmusic'],
      instructionPages = {},
      htmlByUrl = {},
    } = options;

    const component = Object.create(DocumentAccessDenied.prototype) as DocumentAccessDenied;
    const loadedUrls: string[] = [];

    // Field initializers never run under `Object.create(prototype)`, so the
    // instance fields `detectAllLicenseTypes()` mutates are seeded by hand.
    component.metadata = { uuid: 'uuid:1', licences: documentLicenses } as any;
    component.licenseTypes = new Set<string>();
    component.uniqueLicenseTypes = [];
    component.instructionHtml = '';

    (component as any).configService = {
      licenses: configuredLicenses.map(id => ({ id })),
      getLicenseOrder: () => configuredLicenses,
      getInstructionPageUrl: (licenseId: string) => instructionPages[licenseId] ?? null,
      getPageContentUrl: () => null,
      loadHtmlContent: (url: string) => {
        loadedUrls.push(url);
        return Promise.resolve(htmlByUrl[url] ?? '');
      },
      getLocalizedLabel: (_t: string, key: string) => key,
    };
    (component as any).translationService = { currentLanguage: () => ({ code: 'cs' }) };
    (component as any).translate = { instant: (key: string) => key };
    (component as any).router = { url: '/view/uuid:1' };
    (component as any).cdr = { markForCheck: () => {} };

    return { component, loadedUrls };
  }

  it('omits licenses that are not defined in the config', () => {
    const { component } = makeComponent({ documentLicenses: ['dnnto', 'onsite', 'covid'] });

    component.detectAllLicenseTypes();

    expect(component.uniqueLicenseTypes).toEqual(['dnnto', 'onsite']);
    expect(component.uniqueLicenseTypes).not.toContain('covid');
  });

  it('falls back to "other" when every license of the document is undefined in config', () => {
    const { component } = makeComponent({ documentLicenses: ['covid'] });

    component.detectAllLicenseTypes();

    expect(component.uniqueLicenseTypes).toEqual(['other']);
  });

  it('shows the instructions of every displayed license, ordered by license order', async () => {
    const { component } = makeComponent({
      documentLicenses: ['onsite', 'dnnto'],
      instructionPages: { dnnto: 'dnnto.cs.html', onsite: 'onsite.cs.html' },
      htmlByUrl: { 'dnnto.cs.html': '<p>Log in</p>', 'onsite.cs.html': '<p>Visit the reading room</p>' },
    });

    component.detectAllLicenseTypes();
    await (component as any).loadHtmlContent();

    expect(component.instructionHtml).toContain('Log in');
    expect(component.instructionHtml).toContain('Visit the reading room');
    expect(component.instructionHtml.indexOf('Log in'))
      .toBeLessThan(component.instructionHtml.indexOf('Visit the reading room'));
  });

  it('does not request an instruction page for a license missing from the config', async () => {
    const { component, loadedUrls } = makeComponent({
      documentLicenses: ['dnnto', 'covid'],
      instructionPages: { dnnto: 'dnnto.cs.html', covid: 'covid.cs.html' },
      htmlByUrl: { 'dnnto.cs.html': '<p>Log in</p>', 'covid.cs.html': '<p>Covid</p>' },
    });

    component.detectAllLicenseTypes();
    await (component as any).loadHtmlContent();

    expect(loadedUrls).toEqual(['dnnto.cs.html']);
    expect(component.instructionHtml).not.toContain('Covid');
  });

  it('requests no instruction page when the license list falls back to "other"', async () => {
    // The instructions are keyed off the detected license list, which collapses to
    // `other` when nothing is recognised; `other` is not a configured license and so
    // has no instruction page to fetch.
    const { component, loadedUrls } = makeComponent({
      documentLicenses: ['covid'],
      instructionPages: { covid: 'covid.cs.html' },
    });

    component.detectAllLicenseTypes();
    await (component as any).loadHtmlContent();

    expect(component.uniqueLicenseTypes).toEqual(['other']);
    expect(loadedUrls).toEqual([]);
    expect(component.instructionHtml).toBe('');
  });

  it('asks for instructions by base license id, so a source-scoped variant can win', async () => {
    // Variant resolution lives in ConfigService: `getInstructionPageUrl('onsite', lang)`
    // resolves `onsite__<selected source>` when such a variant is configured (covered in
    // config.service.spec.ts). That only works if this screen keeps passing the BASE id —
    // `uniqueLicenseTypes` holds base ids, and variants never reach it because
    // `ConfigService.licenses` filters them out. This pins that contract: with an
    // `onsite__nkp` variant configured, the reading-room text follows the selected source
    // instead of staying on the generic (MZK-worded) base page.
    const { component } = makeComponent({
      documentLicenses: ['onsite'],
      instructionPages: { onsite: 'onsite.nkp.instruction.cs.html' },
      htmlByUrl: { 'onsite.nkp.instruction.cs.html': '<p>Terminal at NKP</p>' },
    });

    component.detectAllLicenseTypes();
    await (component as any).loadHtmlContent();

    expect(component.uniqueLicenseTypes).toEqual(['onsite']);
    expect(component.instructionHtml).toContain('Terminal at NKP');
  });

  it('renders a shared instruction page only once when two licenses point at it', async () => {
    const { component } = makeComponent({
      documentLicenses: ['dnnto', 'dnntt'],
      instructionPages: { dnnto: 'shared.cs.html', dnntt: 'shared.cs.html' },
      htmlByUrl: { 'shared.cs.html': '<p>Shared</p>' },
    });

    component.detectAllLicenseTypes();
    await (component as any).loadHtmlContent();

    expect(component.instructionHtml.match(/Shared/g)?.length).toBe(1);
  });

  /**
   * The instruction pages in config are sentence fragments continuing the
   * "To view it:" lead-in ("log in with a partner library account.", "view the
   * document at a terminal in ..."). They were being concatenated bare, which ran
   * two licenses' instructions together into one ungrammatical line and dropped the
   * lead-in entirely, so a reader saw neither what the sentences were completing nor
   * that each described a different route to the content (issue #195).
   */

  it('keeps each license instruction in its own paragraph', async () => {
    const { component } = makeComponent({
      documentLicenses: ['dnnto', 'onsite'],
      instructionPages: { dnnto: 'dnnto.cs.html', onsite: 'onsite.cs.html' },
      htmlByUrl: {
        'dnnto.cs.html': '<a href="#">log in</a> with a partner library account.',
        'onsite.cs.html': 'View the document at a terminal.',
      },
    });

    component.detectAllLicenseTypes();
    await (component as any).loadHtmlContent();

    expect(component.instructionHtml.match(/<p class="instruction-item">/g)?.length).toBe(2);
    // The fragments must not run together into a single line.
    expect(component.instructionHtml).not.toContain('account.View');
  });

  it('adds no paragraph wrapper when there are no instructions', async () => {
    const { component } = makeComponent({
      documentLicenses: ['covid'],
      instructionPages: { covid: 'covid.cs.html' },
    });

    component.detectAllLicenseTypes();
    await (component as any).loadHtmlContent();

    // The template keys the lead-in off this being empty, so an empty run must
    // stay exactly empty rather than becoming an empty paragraph.
    expect(component.instructionHtml).toBe('');
  });
});
