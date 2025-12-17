import { Injectable, signal, computed, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SelectionService } from './selection.service';

@Injectable({
  providedIn: 'root'
})
export class AdminModeService {
  private router = inject(Router);
  private selectionService = inject(SelectionService);
  private isAdminMode = signal<boolean>(false);

  constructor() {
    // Listen to router events and disable admin mode on navigation
    // but preserve admin mode for same-page navigation (e.g., page size changes)
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      if (this.isAdminMode()) {
        // Only disable admin mode if we're navigating to a different page
        // Keep admin mode for same-page query parameter changes (pagination, page size)
        const currentPath = event.urlAfterRedirects.split('?')[0];
        const previousPath = event.url.split('?')[0];
        
        if (currentPath !== previousPath) {
          this.setAdminMode(false);
        }
      }
    });
  }

  readonly adminMode = computed(() => this.isAdminMode());

  toggleAdminMode(): void {
    this.isAdminMode.update(current => {
      const newValue = !current;
      // When enabling admin mode, also enable selection mode
      // When disabling admin mode, disable selection mode (which clears selection)
      this.selectionService.setSelectionMode(newValue);
      return newValue;
    });
  }

  setAdminMode(enabled: boolean): void {
    this.isAdminMode.set(enabled);
    // Sync selection mode with admin mode
    this.selectionService.setSelectionMode(enabled);
  }
}