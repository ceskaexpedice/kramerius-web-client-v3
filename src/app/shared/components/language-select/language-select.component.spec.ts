import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageSelectComponent } from './language-select.component';

/**
 * Regression tests for issue #161: the language dropdown is right-aligned to its
 * trigger via a fixed `right` offset. In the AI toolbar the trigger sits at the
 * far left, so on a phone the 225px-wide panel was pushed off the left edge of
 * the screen and most of it could not be seen or tapped.
 */
describe('LanguageSelectComponent dropdown positioning', () => {
  /** Natural size the stylesheet gives the dropdown. */
  const NATURAL_WIDTH = 225;
  const NATURAL_HEIGHT = 320;
  const MARGIN = 8;

  let originalWidth: number;
  let originalHeight: number;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [LanguageSelectComponent] });
    originalWidth = window.innerWidth;
    originalHeight = window.innerHeight;
  });

  afterEach(() => {
    setViewport(originalWidth, originalHeight);
  });

  /** The component injects an Injector, so build it inside a TestBed context. */
  function makeComponent(): LanguageSelectComponent {
    return TestBed.createComponent(LanguageSelectComponent).componentInstance;
  }

  /**
   * A real element with a stubbed rect: positioning reads the declared dropdown
   * size off it via getComputedStyle, which needs an actual Element.
   */
  function makeTriggerElement(rect: { left: number; right: number; top: number; bottom: number }): HTMLElement {
    const el = document.createElement('div');
    el.style.setProperty('--lang-dropdown-width', '225px');
    el.style.setProperty('--lang-dropdown-max-height', '320px');
    document.body.appendChild(el);
    spyOn(el, 'getBoundingClientRect').and.returnValue(rect as DOMRect);
    return el;
  }

  function setViewport(width: number, height: number): void {
    Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: height, configurable: true });
  }

  /**
   * Positions the dropdown for a trigger at the given rect, with a stub dropdown
   * element reporting the size the stylesheet would render.
   */
  function position(
    viewport: { width: number; height: number },
    rect: { left: number; right: number; top: number; bottom: number },
    natural: { width: number; height: number } = { width: NATURAL_WIDTH, height: NATURAL_HEIGHT },
  ) {
    setViewport(viewport.width, viewport.height);

    const component = makeComponent();
    (component as any).trigger = { nativeElement: makeTriggerElement(rect) };
    // Assign the backing field: the public setter starts a ResizeObserver, which
    // needs a real Element. These tests exercise the positioning maths only.
    (component as any)._dropdown = {
      nativeElement: { offsetWidth: natural.width, offsetHeight: natural.height },
    };
    (component as any).updatePosition();

    // Effective size after any clamp the component applied.
    const width = component.dropdownMaxWidth ?? natural.width;
    const height = component.dropdownMaxHeight ?? natural.height;
    return {
      width,
      height,
      maxWidth: component.dropdownMaxWidth,
      maxHeight: component.dropdownMaxHeight,
      left: viewport.width - component.dropdownRight - width,
      right: component.dropdownRight,
      top: component.dropdownTop,
    };
  }

  it('keeps the dropdown on screen when the trigger is near the left edge', () => {
    // The screenshot case: AI toolbar on a 390px phone, trigger at the far left.
    const d = position({ width: 390, height: 780 }, { left: 20, right: 100, top: 30, bottom: 66 });

    expect(d.left).toBeGreaterThanOrEqual(0);
    expect(d.left + d.width).toBeLessThanOrEqual(390);
  });

  it('still right-aligns to the trigger when there is room', () => {
    const d = position({ width: 390, height: 780 }, { left: 300, right: 380, top: 30, bottom: 66 });

    expect(d.right).toBe(390 - 380);
    expect(d.left).toBeGreaterThanOrEqual(0);
  });

  it('does not constrain the dropdown when it already fits', () => {
    // No clamp should be applied in the comfortable case — the stylesheet wins.
    const d = position({ width: 1200, height: 900 }, { left: 900, right: 1000, top: 30, bottom: 66 });

    expect(d.maxWidth).toBeNull();
    expect(d.maxHeight).toBeNull();
  });

  it('constrains the width only when the viewport is narrower than the dropdown', () => {
    const d = position({ width: 195, height: 780 }, { left: 12, right: 90, top: 30, bottom: 66 });

    expect(d.maxWidth).not.toBeNull();
    expect(d.width).toBeLessThan(NATURAL_WIDTH);
    expect(d.left).toBeGreaterThanOrEqual(0);
    expect(d.left + d.width).toBeLessThanOrEqual(195);
  });

  it('opens below the trigger when there is room', () => {
    const d = position({ width: 390, height: 780 }, { left: 20, right: 100, top: 30, bottom: 66 });

    expect(d.top).toBe(66 + 4);
  });

  it('flips above the trigger when there is not enough room below', () => {
    // Landscape phone, trigger low on the screen.
    const d = position({ width: 740, height: 360 }, { left: 20, right: 100, top: 300, bottom: 336 });

    expect(d.top).toBeLessThan(300);
    expect(d.top).toBeGreaterThanOrEqual(MARGIN);
    expect(d.top + d.height).toBeLessThanOrEqual(360);
  });

  it('clamps from the stylesheet size before the dropdown has rendered', () => {
    // First toggle: @if has not created the element yet, so the size comes from
    // the declared custom properties — and must already be clamped, not left to
    // be corrected after a visible off-screen paint.
    setViewport(390, 780);
    const component = makeComponent();
    (component as any).trigger = {
      nativeElement: makeTriggerElement({ left: 20, right: 100, top: 30, bottom: 66 }),
    };
    (component as any).updatePosition();

    const leftEdge = 390 - component.dropdownRight - 225;
    expect(leftEdge).toBeGreaterThanOrEqual(0);
    expect(component.dropdownTop).toBe(66 + 4);
    expect(Number.isNaN(component.dropdownRight)).toBe(false);
  });

  it('never positions the dropdown past the viewport edges', () => {
    const viewports = [
      { width: 320, height: 640 },
      { width: 390, height: 780 },
      { width: 744, height: 400 },
    ];
    const triggers = [
      { left: 0, right: 60, top: 10, bottom: 46 },
      { left: 100, right: 180, top: 10, bottom: 46 },
    ];

    for (const vp of viewports) {
      for (const t of triggers) {
        const d = position(vp, t);
        expect(d.left).withContext(`left for ${vp.width}px / trigger ${t.left}`).toBeGreaterThanOrEqual(0);
        expect(d.left + d.width).withContext(`right for ${vp.width}px / trigger ${t.left}`).toBeLessThanOrEqual(vp.width);
        expect(d.top).toBeGreaterThanOrEqual(0);
      }
    }
  });

});

/**
 * The dropdown is created by @if, so its real size only exists after render.
 * Measuring it must still land inside a change-detection pass — an
 * afterNextRender hook runs too late and leaves the DOM showing stale state,
 * which made the dropdown never appear on desktop.
 */
describe('LanguageSelectComponent measurement timing', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [LanguageSelectComponent, TranslateModule.forRoot()] });
    setViewportSize(1280, 900);
  });

  function setViewportSize(width: number, height: number): void {
    Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: height, configurable: true });
  }

  it('opens on the first toggle and renders the dropdown visible', async () => {
    const fixture = TestBed.createComponent(LanguageSelectComponent);
    const component = fixture.componentInstance;
    component.languages = [{ code: 'cs', name: 'Czech', icon: '' } as any];
    fixture.detectChanges();

    component.toggle();
    fixture.detectChanges();
    await fixture.whenStable();

    const el = fixture.nativeElement.querySelector('.available-languages');
    expect(el).toBeTruthy();
    // Nothing may leave the dropdown hidden once it is open.
    expect(getComputedStyle(el).visibility).not.toBe('hidden');
  });

  it('positions the dropdown as soon as it is rendered', async () => {
    const fixture = TestBed.createComponent(LanguageSelectComponent);
    const component = fixture.componentInstance;
    component.languages = [{ code: 'cs', name: 'Czech', icon: '' } as any];
    fixture.detectChanges();

    component.toggle();
    fixture.detectChanges();
    await fixture.whenStable();

    // A real offset was computed from the trigger, not left at the initial 0.
    expect(component.dropdownTop).toBeGreaterThan(0);
  });

  it('stops observing once closed', async () => {
    const fixture = TestBed.createComponent(LanguageSelectComponent);
    const component = fixture.componentInstance;
    component.languages = [{ code: 'cs', name: 'Czech', icon: '' } as any];
    fixture.detectChanges();

    component.toggle();
    fixture.detectChanges();
    await fixture.whenStable();
    expect((component as any).dropdownObserver).not.toBeNull();

    component.close();
    fixture.detectChanges();
    expect((component as any).dropdownObserver).toBeNull();
  });

});

/**
 * The dropdown is created by @if, so on the first toggle there is no element to
 * measure. It must still be clamped from the outset: positioning it off-screen
 * and correcting once rendered is exactly the visible jump issue #161 reports.
 */
describe('LanguageSelectComponent first-paint positioning', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [LanguageSelectComponent, TranslateModule.forRoot()] });
  });

  it('clamps the first positioning pass, before the dropdown exists', () => {
    Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 780, configurable: true });

    const fixture = TestBed.createComponent(LanguageSelectComponent);
    const component = fixture.componentInstance;
    component.languages = [{ code: 'cs', name: 'Czech', icon: '' } as any];
    fixture.detectChanges();

    // Trigger at the far left, as in the AI toolbar.
    const trigger = fixture.nativeElement.querySelector('button');
    spyOn(trigger, 'getBoundingClientRect').and.returnValue(
      { left: 20, right: 100, top: 30, bottom: 66, width: 80, height: 36 } as DOMRect);

    component.toggle();

    // The dropdown has not rendered yet, so this is the pre-render pass. Its
    // declared width comes from the stylesheet's custom property.
    const declaredWidth = 225;
    const leftEdge = 390 - component.dropdownRight - declaredWidth;
    expect(leftEdge).toBeGreaterThanOrEqual(0);
  });

});
