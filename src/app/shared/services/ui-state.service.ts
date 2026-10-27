import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

const SIDEBAR_WIDTH_STORAGE_KEY = 'cdk.metadataSidebarWidth';
export const METADATA_SIDEBAR_MIN_WIDTH = 280;
export const METADATA_SIDEBAR_MAX_WIDTH = 560;

@Injectable({
    providedIn: 'root'
})
export class UiStateService {
    private readonly document = inject(DOCUMENT);

    // Shared state for metadata sidebar visibility
    // Default is false as requested for Periodical/Collections
    // DetailView might override this on initialization if it defaults to open
    readonly metadataSidebarOpen = signal<boolean>(false);
    readonly metadataSidebarActiveTab = signal<string | null>(null);

    /**
     * Width (px) the user dragged the metadata sidebar to, or null for the
     * responsive default (--metadata-sidebar-width in _sizes.scss). Persisted
     * per browser so the panel keeps its size across documents and visits.
     */
    readonly metadataSidebarWidth = signal<number | null>(this.readStoredWidth());

    // Header visibility state for scroll-hide behavior
    readonly headerVisible = signal<boolean>(true);

    /**
     * Immersive reading on phones: the global header and the bottom nav bar
     * hide together so the scan gets the full screen (toggled by tapping the viewer).
     */
    readonly immersive = signal<boolean>(false);

    // Search hero visibility — true when the hero search input is visible on screen
    readonly searchHeroVisible = signal<boolean>(true);

    // License bar visibility — true when a license bar is shown at the bottom
    readonly licenseBarVisible = signal<boolean>(false);

    constructor() {
        effect(() => {
            const width = this.metadataSidebarWidth();
            const root = this.document?.documentElement;
            if (!root) return;
            if (width == null) {
                root.style.removeProperty('--metadata-sidebar-width');
            } else {
                root.style.setProperty('--metadata-sidebar-width', `${width}px`);
            }
        });
    }

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

    setImmersive(value: boolean) {
        this.immersive.set(value);
    }

    /** Sets (clamped) or resets (null) the user's metadata sidebar width. */
    setMetadataSidebarWidth(width: number | null) {
        const value = width == null ? null : Math.round(Math.min(METADATA_SIDEBAR_MAX_WIDTH, Math.max(METADATA_SIDEBAR_MIN_WIDTH, width)));
        this.metadataSidebarWidth.set(value);
        try {
            if (value == null) {
                localStorage.removeItem(SIDEBAR_WIDTH_STORAGE_KEY);
            } else {
                localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(value));
            }
        } catch {
            // Storage unavailable (private mode, blocked) — width just won't persist.
        }
    }

    private readStoredWidth(): number | null {
        try {
            const raw = localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
            const n = raw ? Number(raw) : NaN;
            return Number.isFinite(n) ? Math.min(METADATA_SIDEBAR_MAX_WIDTH, Math.max(METADATA_SIDEBAR_MIN_WIDTH, n)) : null;
        } catch {
            return null;
        }
    }
}
