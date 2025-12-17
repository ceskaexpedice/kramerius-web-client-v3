import { Injectable, signal } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class UiStateService {
    // Shared state for metadata sidebar visibility
    // Default is false as requested for Periodical/Collections
    // DetailView might override this on initialization if it defaults to open
    readonly metadataSidebarOpen = signal<boolean>(false);

    toggleMetadataSidebar() {
        this.metadataSidebarOpen.update(value => !value);
    }

    setMetadataSidebarState(isOpen: boolean) {
        this.metadataSidebarOpen.set(isOpen);
    }
}
