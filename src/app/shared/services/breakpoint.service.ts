import { Injectable, signal, computed, inject } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { map } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';

export enum BreakpointSize {
  MobileXS = 'mobile-xs',
  MobileSM = 'mobile-sm',
  TabletSM = 'tablet-sm',
  TabletMD = 'tablet-md',
  TabletLG = 'tablet-lg',
  DesktopSM = 'desktop-sm',
  DesktopMD = 'desktop-md',
  DesktopLG = 'desktop-lg',
  DesktopXL = 'desktop-xl'
}

@Injectable({
  providedIn: 'root'
})
export class BreakpointService {
  manualToggle = signal(false);

  private breakpointObserver = inject(BreakpointObserver);

  // Custom breakpoints based on designer specifications
  private readonly breakpoints = {
    [BreakpointSize.MobileXS]: '(max-width: 407px)',
    [BreakpointSize.MobileSM]: '(min-width: 408px) and (max-width: 603px)',
    [BreakpointSize.TabletSM]: '(min-width: 604px) and (max-width: 853px)',
    [BreakpointSize.TabletMD]: '(min-width: 854px) and (max-width: 1051px)',
    [BreakpointSize.TabletLG]: '(min-width: 1052px) and (max-width: 1279px)',
    [BreakpointSize.DesktopSM]: '(min-width: 1280px) and (max-width: 1439px)',
    [BreakpointSize.DesktopMD]: '(min-width: 1440px) and (max-width: 1611px)',
    [BreakpointSize.DesktopLG]: '(min-width: 1612px) and (max-width: 2211px)',
    [BreakpointSize.DesktopXL]: '(min-width: 2212px)'
  };

  // Current breakpoint signal
  currentBreakpoint = toSignal(
    this.breakpointObserver.observe(Object.values(this.breakpoints)).pipe(
      map(result => {
        for (const [key, query] of Object.entries(this.breakpoints)) {
          if (this.breakpointObserver.isMatched(query)) {
            return key as BreakpointSize;
          }
        }
        return BreakpointSize.DesktopXL; // Default fallback
      })
    ),
    { initialValue: BreakpointSize.DesktopXL }
  );

  /**
   * True when the viewport is too short to host tall floating UI, regardless of
   * width. A phone in landscape is ~360-410px tall but 800-910px wide, so it
   * matches the tablet width breakpoints and would otherwise be treated as a
   * roomy desktop-like layout. 620px sits above every common landscape phone
   * height and below every tablet/desktop height.
   */
  isShortViewport = toSignal(
    this.breakpointObserver.observe('(max-height: 620px)').pipe(map(result => result.matches)),
    { initialValue: false }
  );

  // Computed properties for responsive behavior
  isMobile = computed(() => {
    const bp = this.currentBreakpoint();
    return bp === BreakpointSize.MobileXS || bp === BreakpointSize.MobileSM;
  });

  /**
   * True when viewer chrome must collapse into the toolbar "more" menu instead
   * of rendering as a tall floating column: either a narrow (mobile) viewport
   * or any short one, such as a landscape phone. Deliberately separate from
   * isMobile(), which drives full mobile layout (nav bar, slide-up panels) and
   * must not switch on in landscape — that chrome costs vertical space, which
   * is precisely what is scarce there.
   */
  isCompactViewer = computed(() => this.isMobile() || this.isShortViewport());

  isTablet = computed(() => {
    const bp = this.currentBreakpoint();
    return bp === BreakpointSize.TabletSM ||
           bp === BreakpointSize.TabletMD ||
           bp === BreakpointSize.TabletLG;
  });

  isDesktop = computed(() => {
    const bp = this.currentBreakpoint();
    return bp === BreakpointSize.DesktopSM ||
           bp === BreakpointSize.DesktopMD ||
           bp === BreakpointSize.DesktopLG ||
           bp === BreakpointSize.DesktopXL;
  });

  // Sidebar visibility logic based on designer specs
  sidebarVisible = computed(() => {
    const bp = this.currentBreakpoint();
    switch (bp) {
      case BreakpointSize.MobileXS:
      case BreakpointSize.MobileSM:
      case BreakpointSize.TabletSM:
        return false; // Hidden on mobile and small tablet
      case BreakpointSize.TabletMD:
      case BreakpointSize.TabletLG:
      case BreakpointSize.DesktopSM:
      case BreakpointSize.DesktopMD:
      case BreakpointSize.DesktopLG:
      case BreakpointSize.DesktopXL:
        return true; // Visible on larger tablet and desktop
      default:
        return true;
    }
  });

  // Sidebar width based on designer specs
  sidebarWidth = computed(() => {
    const bp = this.currentBreakpoint();
    const isVisible = this.sidebarVisible();

    if (!isVisible) return 0;

    switch (bp) {
      case BreakpointSize.TabletMD:
      case BreakpointSize.TabletLG:
        return 240; // 240px for tablet
      case BreakpointSize.DesktopSM:
      case BreakpointSize.DesktopMD:
      case BreakpointSize.DesktopLG:
      case BreakpointSize.DesktopXL:
        return 300; // 300px for desktop
      default:
        return 0;
    }
  });

  // Grid columns based on designer specs
  gridColumns = computed(() => {
    const bp = this.currentBreakpoint();
    switch (bp) {
      case BreakpointSize.MobileXS:
        return 1;
      case BreakpointSize.MobileSM:
        return 2;
      case BreakpointSize.TabletSM:
      case BreakpointSize.TabletMD:
        return 3;
      case BreakpointSize.TabletLG:
        return 4;
      case BreakpointSize.DesktopSM:
        return 5;
      case BreakpointSize.DesktopMD:
        return 6;
      case BreakpointSize.DesktopLG:
        return 7;
      case BreakpointSize.DesktopXL:
        return 8;
      default:
        return 5;
    }
  });

  isVisible = computed(() => {
    const responsiveVisible = this.sidebarVisible();
    return responsiveVisible || this.manualToggle();
  });

  // Toggle sidebar for mobile/tablet
  toggleSidebar() {
    this.manualToggle.update(value => !value);
  }
}
