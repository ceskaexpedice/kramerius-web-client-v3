import { Component, HostBinding, Input, inject, computed, OnDestroy, OnInit, Renderer2, ElementRef } from '@angular/core';
import { NgClass, NgTemplateOutlet } from '@angular/common';
import { BreakpointService } from '../../../../shared/services/breakpoint.service';
import { TranslatePipe } from '@ngx-translate/core';
import { FixedPanelComponent } from '../../../../shared/components/fixed-panel/fixed-panel.component';
import { FixedPanelService } from '../../../../shared/components/fixed-panel/fixed-panel.service';

@Component({
  selector: 'app-filter-sidebar',
  imports: [
    NgClass,
    NgTemplateOutlet,
    TranslatePipe,
    FixedPanelComponent,
  ],
  templateUrl: './filter-sidebar.component.html',
  styleUrl: './filter-sidebar.component.scss'
})
export class FilterSidebarComponent implements OnInit, OnDestroy {
  protected breakpointService = inject(BreakpointService);
  /** Phones: the floating toggle (z 800) would paint over an open fixed panel (z 700). */
  protected fixedPanel = inject(FixedPanelService);
  private renderer = inject(Renderer2);
  private el = inject(ElementRef);

  @Input() padding: 'sm' | 'md' | 'lg' | '0' = 'md';
  @Input() scrollable = true;
  @Input() isDisabled = false;
  @Input() dimmed = false;
  @Input() toggleButtonPosition: 'left' | 'right' = 'right';
  @Input() toggleButtonIcon: string = 'icon-filter';
  /** Translation keys of the open/close buttons' accessible names (default: filters). */
  @Input() openLabelKey = 'open-filters';
  @Input() closeLabelKey = 'close-filters';
  @Input() hideToggleButton = false;
  /**
   * Translation key for the mobile slide-up header. Defaults to "Filtry", which
   * fits the search pages; hosts whose left panel is not a filter list either
   * override it or drop the caption entirely via `hideMobileTitle`.
   */
  @Input() mobileTitleKey = 'filters';
  /**
   * Hides the mobile slide-up's caption (the close button stays). For panels
   * whose content is self-explanatory - a page or track grid - where the
   * caption only costs phone height (GitHub issue #177).
   */
  @Input() hideMobileTitle = false;
  /**
   * Extra bottom offset (px) for the fixed toggle button, so it can be lifted
   * clear of a peeking slide-up panel that would otherwise overlap it.
   */
  @Input()
  @HostBinding('style.--filter-toggle-bottom-offset.px')
  toggleButtonBottomOffset = 0;

  // Resize hide state
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;
  private unlistenResize: (() => void) | null = null;

  ngOnInit() {
    this.unlistenResize = this.renderer.listen('window', 'resize', () => {
      this.renderer.addClass(this.el.nativeElement, 'is-repositioning');
      if (this.resizeTimer) clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => {
        this.renderer.removeClass(this.el.nativeElement, 'is-repositioning');
      }, 200);
    });
  }

  // Whether sidebar should be in overlay mode (small tablet, not mobile — mobile uses bottom sheet)
  isOverlay = computed(() => {
    return !this.breakpointService.isMobile() && !this.breakpointService.sidebarVisible();
  });

  ngOnDestroy() {
    if (this.unlistenResize) this.unlistenResize();
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
  }

  // Close sidebar
  closeSidebar() {
    this.breakpointService.manualToggle.set(false);
  }

  // Backdrop click handler
  onBackdropClick() {
    this.closeSidebar();
  }

  /** Escape closes the tablet overlay, unless an open popup inside it consumes the key first. */
  onOverlayEscape(event: Event) {
    if (!this.isOverlay() || !this.breakpointService.isVisible() || event.defaultPrevented) return;
    const target = event.target as Element | null;
    if (target?.closest('[role="listbox"], [role="menu"], [aria-expanded="true"]')) return;
    this.closeSidebar();
  }
}
