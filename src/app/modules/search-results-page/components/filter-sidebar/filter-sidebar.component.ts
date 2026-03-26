import { Component, Input, inject, computed, OnDestroy, OnInit, Renderer2, ElementRef } from '@angular/core';
import { NgClass, NgIf, NgTemplateOutlet } from '@angular/common';
import { BreakpointService } from '../../../../shared/services/breakpoint.service';
import { TranslatePipe } from '@ngx-translate/core';
import { SlideUpPanelComponent } from '../../../../shared/components/slide-up-panel/slide-up-panel.component';

@Component({
  selector: 'app-filter-sidebar',
  imports: [
    NgClass,
    NgIf,
    NgTemplateOutlet,
    TranslatePipe,
    SlideUpPanelComponent,
  ],
  templateUrl: './filter-sidebar.component.html',
  styleUrl: './filter-sidebar.component.scss'
})
export class FilterSidebarComponent implements OnInit, OnDestroy {
  protected breakpointService = inject(BreakpointService);
  private renderer = inject(Renderer2);
  private el = inject(ElementRef);

  @Input() padding: 'sm' | 'md' | 'lg' | '0' = 'md';
  @Input() scrollable = true;
  @Input() isDisabled = false;
  @Input() dimmed = false;
  @Input() toggleButtonPosition: 'left' | 'right' = 'right';
  @Input() toggleButtonIcon: string = 'icon-filter';
  @Input() hideToggleButton = false;

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
}
