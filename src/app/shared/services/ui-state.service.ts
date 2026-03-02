import { Injectable, signal } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class UiStateService {
    // Shared state for metadata sidebar visibility
    // Default is false as requested for Periodical/Collections
    // DetailView might override this on initialization if it defaults to open
    readonly metadataSidebarOpen = signal<boolean>(false);
    readonly metadataSidebarActiveTab = signal<string | null>(null);

    // Header visibility state for scroll-hide behavior
    readonly headerVisible = signal<boolean>(true);

    // Search hero visibility — true when the hero search input is visible on screen
    readonly searchHeroVisible = signal<boolean>(true);

    toggleMetadataSidebar() {
        this.metadataSidebarOpen.update(value => !value);
    }

    setMetadataSidebarState(isOpen: boolean) {
        this.metadataSidebarOpen.set(isOpen);
    }

    setMetadataSidebarActiveTab(tab: string | null) {
        this.metadataSidebarActiveTab.set(tab);
    }

    setHeaderVisibility(visible: boolean) {
        this.headerVisible.set(visible);
    }
}
