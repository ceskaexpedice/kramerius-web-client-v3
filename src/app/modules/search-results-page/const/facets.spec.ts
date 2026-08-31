import { FacetIcons, getAccessIcon } from './facets';

/**
 * The accessibility icons must stay identical to the legacy client
 * (kramerius-web-client, LicenceService.accessIcon), so a user moving between the
 * two sees the same symbols:
 *
 *   open → visibility, login → key, terminal → account_balance
 *
 * These are Material Icons ligatures rendered as element text, not glyphs from
 * this app's own `cdk-icons` font — a detail that is easy to undo by accident when
 * someone "tidies" the icon names back into the `icon` class.
 */
describe('FacetIcons accessibility symbols', () => {
  it('uses the legacy client ligature names', () => {
    expect(FacetIcons.public.materialIcon).toBe('visibility');
    // Not held by the user → struck-through key, exactly as the legacy client draws it.
    expect(FacetIcons.locked.materialIcon).toBe('key_off');
    expect(FacetIcons.unlocked.materialIcon).toBe('key');
    expect(FacetIcons.onsite.materialIcon).toBe('account_balance');
  });

  it('marks every accessibility icon as a Material icon', () => {
    for (const entry of Object.values(FacetIcons)) {
      expect(entry.icon).toBe('material-icons');
      // A ligature name is mandatory: with `material-icons` on the class but no
      // text content, the element renders as an empty box.
      expect(entry.materialIcon).toBeTruthy();
    }
  });

  it('keeps the colour classes that distinguish the two after-login states', () => {
    expect(FacetIcons.locked.iconClass).toBe('accessibility-private');
    expect(FacetIcons.unlocked.iconClass).toBe('accessibility-public');
  });

  it('does not reference the own-font glyphs it replaced', () => {
    const replaced = ['icon-locked', 'icon-in-house', 'icon-eye-public', 'icon-key', 'icon-courthouse'];
    for (const entry of Object.values(FacetIcons)) {
      expect(replaced).not.toContain(entry.icon);
    }
  });
});

/**
 * Renders the radio filter (the accessibility facet's actual UI) to confirm the
 * ligature reaches the DOM as element TEXT. The constant being right is not enough:
 * if a template drops `{{ item.materialIcon }}`, the class alone renders an empty
 * box and the constant-level tests above would still pass.
 */
describe('accessibility icon rendering', () => {
  it('puts the ligature name in the icon element text', async () => {
    const { TestBed } = await import('@angular/core/testing');
    const { TranslateModule } = await import('@ngx-translate/core');
    const { FilterItemsRadioComponent } = await import(
      '../../../shared/components/filter-items-radio/filter-items-radio.component'
    );

    await TestBed.configureTestingModule({
      imports: [FilterItemsRadioComponent, TranslateModule.forRoot()],
    }).compileComponents();

    const fixture = TestBed.createComponent(FilterItemsRadioComponent);
    fixture.componentRef.setInput('items', [
      { name: 'onsite', count: 1, ...FacetIcons.onsite },
    ]);
    fixture.componentRef.setInput('selected', 'onsite');
    fixture.detectChanges();

    const icon: HTMLElement = fixture.nativeElement.querySelector('.icon i');
    expect(icon).toBeTruthy();
    expect(icon.classList).toContain('material-icons');
    expect(icon.textContent?.trim()).toBe('account_balance');
  });
});

/**
 * Mirrors the legacy client's LicenceService.accessIcon(access, accessible):
 * the glyph comes from the license's access type, and whether the user actually
 * holds the license picks the plain vs. the struck-through variant.
 */
describe('getAccessIcon', () => {
  it('uses key vs key_off for after-login licenses', () => {
    expect(getAccessIcon('login', true).materialIcon).toBe('key');
    expect(getAccessIcon('login', false).materialIcon).toBe('key_off');
  });

  it('uses visibility vs visibility_off for open licenses', () => {
    expect(getAccessIcon('open', true).materialIcon).toBe('visibility');
    expect(getAccessIcon('open', false).materialIcon).toBe('visibility_off');
  });

  it('uses account_balance for terminal licenses regardless of access', () => {
    // The legacy client returns the same glyph either way: the building is where
    // you go to read it, whether or not you already hold the licence.
    expect(getAccessIcon('terminal', true).materialIcon).toBe('account_balance');
    expect(getAccessIcon('terminal', false).materialIcon).toBe('account_balance');
  });

  it('falls back to lock_open / lock for anything else', () => {
    expect(getAccessIcon('inaccessible', true).materialIcon).toBe('lock_open');
    expect(getAccessIcon('inaccessible', false).materialIcon).toBe('lock');
  });

  it('marks every result as a Material icon with a ligature', () => {
    for (const type of ['open', 'login', 'terminal', 'inaccessible']) {
      for (const accessible of [true, false]) {
        const res = getAccessIcon(type, accessible);
        expect(res.icon).toBe('material-icons');
        expect(res.materialIcon).toBeTruthy();
      }
    }
  });

  it('colours a held login licence as available and a missing one as private', () => {
    expect(getAccessIcon('login', true).iconClass).toBe('accessibility-public');
    expect(getAccessIcon('login', false).iconClass).toBe('accessibility-private');
  });
});
