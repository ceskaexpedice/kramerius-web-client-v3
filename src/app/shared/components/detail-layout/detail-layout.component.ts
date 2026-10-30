import {Component, HostListener, computed, effect, inject, Input, untracked} from '@angular/core';
import {
  FilterSidebarComponent
} from "../../../modules/search-results-page/components/filter-sidebar/filter-sidebar.component";
import {DetailViewService} from '../../../modules/detail-view-page/services/detail-view.service';
import {TranslatePipe} from '@ngx-translate/core';
import {shouldIgnorePageHotkey} from '../../utils/page-hotkeys';
import {BreakpointService} from '../../services/breakpoint.service';
import {UiStateService} from '../../services/ui-state.service';
import {PanelResizeHandleComponent} from '../panel-resize-handle/panel-resize-handle.component';
import {METADATA_PANEL_ID} from './metadata-panel-id';

@Component({
  selector: 'app-detail-layout',
  imports: [
    FilterSidebarComponent,
    TranslatePipe,
    PanelResizeHandleComponent
  ],
  templateUrl: './detail-layout.component.html',
  styleUrl: './detail-layout.component.scss'
})
export class DetailLayoutComponent {

  @Input() constrainBottomToolbar = false;

  @Input() showBottomToolbar = true;

  @Input() showRightSidebar = false;

  @Input() rightSidebarCollapsed = false;

  @Input() hideFilterToggle = false;

  /** Forwarded to the left filter-sidebar's mobile fixed panel header. */
  @Input() leftSidebarMobileTitleKey = 'filters';

  /**
   * Drops the left fixed panel's caption on mobile, keeping only its close button.
   * The document/recording panels below are self-describing, so the caption was
   * both redundant and a waste of phone height (GitHub issue #177).
   */
  @Input() hideLeftSidebarMobileTitle = false;

  private detailViewService = inject(DetailViewService);
  private breakpointService = inject(BreakpointService);
  protected uiStateService = inject(UiStateService);

  protected toolbarHidden = computed(() =>
    this.uiStateService.immersive() || !this.uiStateService.headerVisible());

  readonly rightSidebarId = METADATA_PANEL_ID;

  /**
   * Tablets (604–1279px): the right panel floats over the viewer instead of
   * taking ~300px from it, and only one side panel is open at a time.
   */
  readonly rightOverlay = computed(() => !this.breakpointService.isMobile() && this.breakpointService.rightSidebarOverlaysContent());

  constructor() {
    // Opening the left (pages) overlay closes the right overlay panel …
    effect(() => {
      const leftOpen = this.breakpointService.manualToggle();
      if (leftOpen && untracked(() => this.rightOverlay() && this.uiStateService.metadataSidebarOpen())) {
        this.uiStateService.setMetadataSidebarState(false);
      }
    });
    // … and vice versa.
    effect(() => {
      const rightOpen = this.uiStateService.metadataSidebarOpen();
      if (rightOpen && untracked(() => this.rightOverlay() && this.breakpointService.manualToggle())) {
        this.breakpointService.manualToggle.set(false);
      }
    });
    // Overlay drawer just opened from the toolbar toggle: move focus into it so
    // keyboard / screen-reader users land in the panel and Escape works at once.
    let wasOpen = this.uiStateService.metadataSidebarOpen();
    effect(() => {
      const open = this.uiStateService.metadataSidebarOpen();
      const overlay = untracked(() => this.rightOverlay());
      if (open && !wasOpen && overlay) {
        const toggle = document.activeElement as HTMLElement | null;
        if (toggle?.getAttribute('aria-controls') === this.rightSidebarId) {
          setTimeout(() => {
            const panel = document.getElementById(this.rightSidebarId);
            const target = panel?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"], [role="tabpanel"], [role="region"]');
            target?.focus();
          }, 50);
        }
      }
      wasOpen = open;
    });
  }

  onRightSidebarEscape(event: Event): void {
    if (!this.rightOverlay() || this.rightSidebarCollapsed) return;
    // Let a popup that is actually open (select listbox, menu, overlay) consume
    // Escape first; plain disclosure buttons (group headings, "more") must not block it.
    const target = event.target as Element | null;
    if (event.defaultPrevented
      || target?.closest('[role="listbox"], [role="menu"], .cdk-overlay-container')
      || target?.closest('[aria-haspopup][aria-expanded="true"], [role="combobox"][aria-expanded="true"]')) return;
    this.uiStateService.setMetadataSidebarState(false);
    (document.querySelector(`[aria-controls="${this.rightSidebarId}"]`) as HTMLElement | null)?.focus();
  }

  @HostListener('document:keydown', ['$event'])
  keydownHandler(event: KeyboardEvent) {
    if (shouldIgnorePageHotkey(event)) {
      return;
    }
    switch (event.key) {
      case 'ArrowLeft': {
        this.detailViewService.goToPrevious();
        break;
      }
      case 'ArrowRight': {
        this.detailViewService.goToNext();
        break;
      }
      case 'ArrowUp': {
        // go -3 pages
        this.detailViewService.goToPrevious(3);
        break;
      }
      case 'ArrowDown': {
        // go +3 pages
        this.detailViewService.goToNext(3);
        break;
      }
      default: {
        // Do nothing
      }
    }
  }

}
