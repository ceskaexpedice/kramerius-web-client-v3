import { FacetIcons } from './facets';

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
    expect(FacetIcons.locked.materialIcon).toBe('key');
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
