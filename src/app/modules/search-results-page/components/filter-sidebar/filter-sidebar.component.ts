import { Component, Input, inject, signal, computed, OnDestroy, Renderer2 } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';
import { BreakpointService } from '../../../../shared/services/breakpoint.service';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-filter-sidebar',
  imports: [
    NgClass,
    NgIf,
    TranslatePipe,
  ],
  templateUrl: './filter-sidebar.component.html',
  styleUrl: './filter-sidebar.component.scss'
})
export class FilterSidebarComponent implements OnDestroy {
  protected breakpointService = inject(BreakpointService);
  private renderer = inject(Renderer2);

  @Input() padding: 'sm' | 'md' | 'lg' | '0' = 'md';
  @Input() scrollable = true;
  @Input() isDisabled = false;

  // Manual toggle state for mobile/tablet overlay
  manualToggle = signal(false);

  // Bottom sheet expanded state (mobile only)
  isExpanded = false;

  // Drag state
  isDragging = false;
  private startY = 0;
  private startHeight = 0;
  currentHeight = 50; // Current height in vh

  // Event listeners cleanup functions
  private unlistenMouseMove: (() => void) | null = null;
  private unlistenTouchMove: (() => void) | null = null;
  private unlistenMouseUp: (() => void) | null = null;
  private unlistenTouchEnd: (() => void) | null = null;

  // Computed visibility: responsive + manual toggle
  isVisible = computed(() => {
    const responsiveVisible = this.breakpointService.sidebarVisible();
    return responsiveVisible || this.manualToggle();
  });

  // Whether sidebar should be in overlay mode (mobile/small tablet)
  isOverlay = computed(() => {
    return this.breakpointService.isMobile() || !this.breakpointService.sidebarVisible();
  });

  // Toggle expanded state for bottom sheet
  toggleExpanded() {
    this.isExpanded = !this.isExpanded;
    this.currentHeight = this.isExpanded ? 90 : 50;
  }

  // Drag handlers
  onDragStart(event: MouseEvent | TouchEvent) {
    this.isDragging = true;
    this.startY = this.getClientY(event);
    this.startHeight = this.currentHeight;
    event.preventDefault();

    this.addDragListeners();
  }

  private addDragListeners() {
    this.unlistenMouseMove = this.renderer.listen('window', 'mousemove', (e) => this.onWindowMove(e));
    this.unlistenTouchMove = this.renderer.listen('window', 'touchmove', (e) => this.onWindowMove(e));
    this.unlistenMouseUp = this.renderer.listen('window', 'mouseup', () => this.onWindowEnd());
    this.unlistenTouchEnd = this.renderer.listen('window', 'touchend', () => this.onWindowEnd());
  }

  private removeDragListeners() {
    if (this.unlistenMouseMove) this.unlistenMouseMove();
    if (this.unlistenTouchMove) this.unlistenTouchMove();
    if (this.unlistenMouseUp) this.unlistenMouseUp();
    if (this.unlistenTouchEnd) this.unlistenTouchEnd();

    this.unlistenMouseMove = null;
    this.unlistenTouchMove = null;
    this.unlistenMouseUp = null;
    this.unlistenTouchEnd = null;
  }

  onWindowMove(event: MouseEvent | TouchEvent) {
    if (!this.isDragging) return;

    const currentY = this.getClientY(event);
    const deltaY = this.startY - currentY;
    const viewportHeight = window.innerHeight;
    const deltaVh = (deltaY / viewportHeight) * 100;

    let newHeight = this.startHeight + deltaVh;

    // Constrain between 30vh and 90vh
    newHeight = Math.max(30, Math.min(90, newHeight));

    this.currentHeight = newHeight;
    this.isExpanded = newHeight > 70;

    // Prevent default behavior (scrolling) while dragging
    if (event.cancelable) {
      event.preventDefault();
    }
  }

  onWindowEnd() {
    if (!this.isDragging) return;

    this.isDragging = false;
    this.removeDragListeners();

    // Snap to nearest breakpoint
    if (this.currentHeight < 40) {
      this.currentHeight = 30;
      this.isExpanded = false;
    } else if (this.currentHeight < 70) {
      this.currentHeight = 50;
      this.isExpanded = false;
    } else {
      this.currentHeight = 90;
      this.isExpanded = true;
    }
  }

  ngOnDestroy() {
    this.removeDragListeners();
  }

  private getClientY(event: MouseEvent | TouchEvent): number {
    if (event instanceof MouseEvent) {
      return event.clientY;
    } else {
      return event.touches[0]?.clientY || 0;
    }
  }

  // Close sidebar
  closeSidebar() {
    this.manualToggle.set(false);
    this.isExpanded = false;
    this.currentHeight = 50;
  }

  // Backdrop click handler
  onBackdropClick() {
    this.closeSidebar();
  }
}
