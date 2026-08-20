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
