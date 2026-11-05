import { HeaderComponent } from './header.component';

/**
 * Guards the mobile hamburger toggle. The menu closes on an outside `pointerdown`
 * (after a short timeout); the hamburger button sits outside the menu, so a tap on
 * it used to close the menu and then let the button's `click` toggle it open again.
 * Used as a plain object, like the logo spec, to avoid the header's dependency graph.
 */
describe('HeaderComponent mobile menu', () => {
  let component: HeaderComponent;
  let toggle: HTMLButtonElement;
  let icon: HTMLElement;

  beforeEach(() => {
    jasmine.clock().install();
    component = Object.create(HeaderComponent.prototype) as HeaderComponent;
    component.isMobileMenuOpen = false;
    toggle = document.createElement('button');
    icon = document.createElement('i');
    toggle.appendChild(icon);
  });

  afterEach(() => jasmine.clock().uninstall());

  /** pointerdown (outside handler) followed by the button's click, as a tap does. */
  function tapToggle(target: Element): void {
    component.onMobileMenuClickOutside({ target } as unknown as Event, toggle);
    jasmine.clock().tick(100);
    component.toggleMobileMenu();
    jasmine.clock().tick(100);
  }

  it('closes the open menu when its toggle button is tapped again', () => {
    tapToggle(toggle);
    expect(component.isMobileMenuOpen).toBe(true);
    tapToggle(icon);
    expect(component.isMobileMenuOpen).toBe(false);
  });

  it('still closes on a press elsewhere outside the menu', () => {
    component.isMobileMenuOpen = true;
    component.onMobileMenuClickOutside({ target: document.body } as unknown as Event, toggle);
    jasmine.clock().tick(100);
    expect(component.isMobileMenuOpen).toBe(false);
  });

  it('closes on Escape (emitted without an event)', () => {
    component.isMobileMenuOpen = true;
    component.onMobileMenuClickOutside(undefined, toggle);
    jasmine.clock().tick(100);
    expect(component.isMobileMenuOpen).toBe(false);
  });
});
