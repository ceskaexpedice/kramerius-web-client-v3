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
