import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import { MenuComponent, MenuItem, MenuPlacement } from './menu.component';

/**
 * Regression coverage for issue #162: on a landscape phone the viewport is only
 * ~360-410px tall, while the toolbar's "more" menu merges the viewer controls
 * with the toolbar actions and can reach a dozen items. The panel used to grow
 * past the screen with `overflow: clip`, so the items below the fold could
 * neither be seen nor scrolled to.
 */
describe('MenuComponent', () => {
  let component: MenuComponent;
  let fixture: ComponentFixture<MenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuComponent, TranslateModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(MenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  /** Builds a menu long enough to overflow a landscape phone viewport. */
  function longItemList(count = 12): MenuItem[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `item-${i}`,
      label: `Item ${i}`,
      icon: 'crop',
    }));
  }

  function openWith(items: MenuItem[]): HTMLElement {
    fixture.componentRef.setInput('items', items);
    component.open.set(true);
    fixture.detectChanges();

    const panel = document.querySelector('.menu-panel') as HTMLElement;
    expect(panel).withContext('menu panel should be rendered when open').toBeTruthy();
    return panel;
  }

  afterEach(() => {
    component.close();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('when the item list is taller than the viewport', () => {
    it('caps the panel height instead of letting it run off screen', () => {
      const panel = openWith(longItemList());
      const maxHeight = getComputedStyle(panel).maxHeight;

      expect(maxHeight).not.toBe('none');
      expect(panel.getBoundingClientRect().height)
        .toBeLessThanOrEqual(window.innerHeight);
    });

    it('scrolls the overflowing items rather than clipping them away', () => {
      const panel = openWith(longItemList());

      expect(getComputedStyle(panel).overflowY).toMatch(/auto|scroll/);
    });

    it('keeps every item in the DOM so scrolling can reach them', () => {
      const panel = openWith(longItemList());

      expect(panel.querySelectorAll('.menu-item').length).toBe(12);
    });
  });

  describe('overlay positioning', () => {
    /** Each placement needs a vertical fallback, or a short viewport has nowhere to flip to. */
    const placements: MenuPlacement[] = ['bottom-start', 'bottom-end', 'top-start', 'top-end'];

    placements.forEach(placement => {
      it(`offers a flipped fallback position for "${placement}"`, () => {
        fixture.componentRef.setInput('placement', placement);
        fixture.detectChanges();

        const positions = component.overlayPositions();

        expect(positions.length).toBeGreaterThan(1);
        expect(positions[0].overlayY).not.toBe(positions[1].overlayY);
      });
    });

    it('keeps the requested side as the preferred position', () => {
      fixture.componentRef.setInput('placement', 'bottom-end');
      fixture.detectChanges();

      const [preferred] = component.overlayPositions();

      expect(preferred.originY).toBe('bottom');
      expect(preferred.overlayY).toBe('top');
    });

    it('repositions on scroll so the flip keeps holding', () => {
      expect(component.scrollStrategy).toBeTruthy();
    });
  });
});
