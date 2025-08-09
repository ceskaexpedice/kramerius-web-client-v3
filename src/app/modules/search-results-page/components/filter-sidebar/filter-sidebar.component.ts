import {Component, Input, inject, signal, computed} from '@angular/core';
import {NgClass, NgIf} from '@angular/common';
import {BreakpointService} from '../../../../shared/services/breakpoint.service';

@Component({
  selector: 'app-filter-sidebar',
  imports: [
    NgClass,
    NgIf,
  ],
  templateUrl: './filter-sidebar.component.html',
  styleUrl: './filter-sidebar.component.scss'
})
export class FilterSidebarComponent {
  protected breakpointService = inject(BreakpointService);

  @Input() padding: 'sm' | 'md' | 'lg' | '0' = 'md';
  @Input() scrollable = true;

  // Manual toggle state for mobile/tablet overlay
  manualToggle = signal(false);

  // Computed visibility: responsive + manual toggle
  isVisible = computed(() => {
    const responsiveVisible = this.breakpointService.sidebarVisible();
    return responsiveVisible || this.manualToggle();
  });

  // Whether sidebar should be in overlay mode (mobile/small tablet)
  isOverlay = computed(() => {
    return this.breakpointService.isMobile() || !this.breakpointService.sidebarVisible();
  });

  // Toggle sidebar for mobile/tablet
  toggleSidebar() {
    this.manualToggle.update(value => !value);
  }

  // Close sidebar
  closeSidebar() {
    this.manualToggle.set(false);
  }

  // Backdrop click handler
  onBackdropClick() {
    this.closeSidebar();
  }
}
