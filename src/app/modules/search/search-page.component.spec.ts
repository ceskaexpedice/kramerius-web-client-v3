import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SearchPageComponent } from './search-page.component';
import { ConfigService } from '../../core/config/config.service';

/**
 * Regression coverage for the search page footer being unreachable.
 *
 * The host used to be a nested scroll container with a fixed
 * `height: calc(100vh - …)` plus `overflow-y: auto`. Two things went wrong:
 *
 *  1. A fixed height cannot grow with its content, so the footer — the last
 *     element on the page — was pushed past the bottom edge.
 *  2. `vh` ignores the mobile URL bar and overestimates the space available
 *     while that bar is on screen.
 *
 * The fix moves scrolling back onto the document: `min-height` with `dvh`.
 */
describe('SearchPageComponent', () => {
  let fixture: ComponentFixture<SearchPageComponent>;
  let host: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SearchPageComponent],
      providers: [
        // The template only reads `homeSections`; an empty list keeps the
        // component's child sections out of this layout-focused spec.
        { provide: ConfigService, useValue: { homeSections: [] } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchPageComponent);
    host = fixture.nativeElement as HTMLElement;

    // `--header-height` lives in `public/styles/_sizes.scss`, which the app
    // loads globally but the test DOM does not. Without it the `calc()` is
    // invalid and every length below collapses to `0px`, so the assertions
    // would pass for the wrong reason.
    host.style.setProperty('--header-height', '56px');
    document.body.appendChild(host);
    fixture.detectChanges();
  });

  afterEach(() => host.remove());

  it('does not trap the page in a nested scroll container', () => {
    // Scrolling belongs to the document. A nested `auto`/`scroll` box is what
    // put the footer out of reach and desynced the collapsing header.
    expect(getComputedStyle(host).overflowY).not.toMatch(/auto|scroll/);
  });

  it('grows with its content instead of pinning a fixed height', () => {
    const { height, minHeight } = getComputedStyle(host);

    // `height: auto` is what lets a tall footer extend the page.
    expect(height).not.toMatch(/^calc/);
    expect(minHeight).not.toBe('0px');
  });

  it('still fills the viewport on a short page', () => {
    // The whole point of the original `height` was that a nearly empty search
    // page should not leave a gap under the fold — `min-height` has to keep it.
    const minHeight = parseFloat(getComputedStyle(host).minHeight);

    // Measure `100dvh` in this document rather than reading `window.innerHeight`:
    // Karma runs specs inside an iframe, so viewport units resolve against the
    // frame while `window.innerHeight` reports the outer window.
    const probe = document.createElement('div');
    probe.style.height = '100dvh';
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    document.body.appendChild(probe);
    const viewport = probe.getBoundingClientRect().height;
    probe.remove();

    // Viewport height minus the 56px header set above.
    expect(minHeight).toBeCloseTo(viewport - 56, 0);
  });

  it('keeps the footer inside the page box once it renders', () => {
    const footer = document.createElement('app-footer');
    footer.style.height = '600px';
    host.appendChild(footer);
    fixture.detectChanges();

    const hostBottom = host.getBoundingClientRect().bottom;
    const footerBottom = footer.getBoundingClientRect().bottom;

    // A fixed-height host clipped the footer's lower edge off its own box;
    // an auto-height host must contain it.
    expect(footerBottom).toBeLessThanOrEqual(Math.ceil(hostBottom));
  });
});
