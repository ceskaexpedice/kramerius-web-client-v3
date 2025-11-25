import { Component, computed, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { Page } from '../../models/page.model';
import { DetailPageItemComponent } from '../../../modules/detail-view-page/components/detail-page-item/detail-page-item.component';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { FormsModule } from '@angular/forms';

export interface PageSelectionDialogData {
    pages: Page[];
    title?: string;
    maxSelectionCount?: number;
}

export interface PageSelectionDialogResult {
    selectedPagePids: string[];
}

@Component({
    selector: 'app-page-selection-dialog',
    imports: [
        TranslatePipe,
        DetailPageItemComponent,
        MatSlideToggle,
        FormsModule,
    ],
    templateUrl: './page-selection-dialog.component.html',
    styleUrls: ['./page-selection-dialog.component.scss', '../generic-dialog.scss'],
})
export class PageSelectionDialogComponent {
    private dialogRef = inject(MatDialogRef<PageSelectionDialogComponent>);
    data = inject<PageSelectionDialogData>(MAT_DIALOG_DATA);

    pages: Page[] = [];
    dialogTitle: string = 'page-selection-dialog--header';
    maxSelectionCount: number | undefined;

    selectedPagePids = signal<Set<string>>(new Set());
    selectedCount = computed(() => this.selectedPagePids().size);
    allSelected = computed(() => {
        return this.selectedPagePids().size === this.pages.length && this.pages.length > 0;
    });

    isLimitReached = computed(() => {
        return this.maxSelectionCount !== undefined && this.selectedCount() >= this.maxSelectionCount;
    });

    private lastSelectedPid: string | null = null;

    constructor() {
        this.pages = this.data.pages || [];
        if (this.data.title) {
            this.dialogTitle = this.data.title;
        }
        this.maxSelectionCount = this.data.maxSelectionCount;
    }

    /**
     * Toggle selection of a single page or range (with Shift)
     */
    togglePageSelection(pid: string, event?: MouseEvent): void {
        const currentSelection = new Set(this.selectedPagePids());

        // Check if Shift key is pressed and we have a last selected page
        if (event?.shiftKey && this.lastSelectedPid && this.lastSelectedPid !== pid) {
            const lastIndex = this.pages.findIndex(p => p.pid === this.lastSelectedPid);
            const currentIndex = this.pages.findIndex(p => p.pid === pid);

            if (lastIndex !== -1 && currentIndex !== -1) {
                const start = Math.min(lastIndex, currentIndex);
                const end = Math.max(lastIndex, currentIndex);

                for (let i = start; i <= end; i++) {
                    const pagePid = this.pages[i].pid;
                    if (this.maxSelectionCount !== undefined && currentSelection.size >= this.maxSelectionCount && !currentSelection.has(pagePid)) {
                        break;
                    }
                    currentSelection.add(pagePid);
                }

                this.selectedPagePids.set(currentSelection);
                this.lastSelectedPid = pid;
                return;
            }
        }

        if (currentSelection.has(pid)) {
            currentSelection.delete(pid);
            this.lastSelectedPid = null;
        } else {
            if (this.maxSelectionCount !== undefined && currentSelection.size >= this.maxSelectionCount) {
                return;
            }
            currentSelection.add(pid);
            this.lastSelectedPid = pid;
        }

        this.selectedPagePids.set(currentSelection);
    }

    /**
     * Check if a page is selected
     */
    isPageSelected(pid: string): boolean {
        return this.selectedPagePids().has(pid);
    }

    /**
     * Toggle select all / deselect all
     */
    toggleSelectAll(): void {
        if (this.allSelected()) {
            this.selectedPagePids.set(new Set());
        } else {
            let pagesToSelect = this.pages;
            if (this.maxSelectionCount !== undefined && this.pages.length > this.maxSelectionCount) {
                pagesToSelect = this.pages.slice(0, this.maxSelectionCount);
            }

            const allPids = new Set(pagesToSelect.map(page => page.pid));
            this.selectedPagePids.set(allPids);
        }
    }

    /**
     * Submit the selection and close dialog
     */
    onSubmit(): void {
        const result: PageSelectionDialogResult = {
            selectedPagePids: Array.from(this.selectedPagePids())
        };
        this.dialogRef.close(result);
    }

    /**
     * Close dialog without submitting
     */
    onClose(): void {
        this.dialogRef.close();
    }
}
