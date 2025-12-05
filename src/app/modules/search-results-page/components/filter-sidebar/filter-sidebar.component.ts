import {Component, Input, inject, signal, computed} from '@angular/core';
import {NgClass, NgIf} from '@angular/common';
import {BreakpointService} from '../../../../shared/services/breakpoint.service';
import {TranslatePipe} from '@ngx-translate/core';

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
export class FilterSidebarComponent {
  protected breakpointService = inject(BreakpointService);

  @Input() padding: 'sm' | 'md' | 'lg' | '0' = 'md';
  @Input() scrollable = true;
  @Input() isDisabled = false;

  // Manual toggle state for mobile/tablet overlay
  manualToggle = signal(false);

  // Bottom sheet expanded state (mobile only)
  isExpanded = false;

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
  }

  // Close sidebar
  closeSidebar() {
    this.manualToggle.set(false);
    this.isExpanded = false;
  }

  // Backdrop click handler
  onBackdropClick() {
    this.closeSidebar();
  }
}
