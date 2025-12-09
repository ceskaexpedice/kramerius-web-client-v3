import { Component, computed, effect, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { Page } from '../../models/page.model';
import { DetailPageItemComponent } from '../../../modules/detail-view-page/components/detail-page-item/detail-page-item.component';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { FormsModule } from '@angular/forms';
import { InputComponent } from '../../components/input/input.component';

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
        InputComponent,
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

    pageRangeInput = signal<string>('');
    private lastUpdateSource: 'input' | 'programmatic' = 'programmatic';

    constructor() {
        this.pages = this.data.pages || [];
        if (this.data.title) {
            this.dialogTitle = this.data.title;
        }
        this.maxSelectionCount = this.data.maxSelectionCount;

        // Update input field when selection changes (bidirectional binding)
        effect(() => {
            const selectedPids = this.selectedPagePids();
            // Only update the input if the change came from a programmatic source (e.g. clicking items)
            if (this.lastUpdateSource === 'programmatic') {
                const rangeString = this.convertSelectionToRangeString(selectedPids);
                this.pageRangeInput.set(rangeString);
            }
        });
    }

    /**
     * Called when input value changes (on every keystroke)
     */
    onPageRangeInput(value: string | number): void {
        const rangeString = String(value);
        this.lastUpdateSource = 'input';

        // Update the signal for the input value
        this.pageRangeInput.set(rangeString);

        // Apply range immediately
        this.applyPageRange(rangeString);
    }

    /**
     * Apply range when input loses focus
     */
    onPageRangeBlur(): void {
        // When leaving the input, strictly format the value based on the current selection state
        // This ensures "clean" output (e.g., "1, 2" becomes "1-2" or "1,2" depending on style)
        const currentSelection = this.selectedPagePids();
        const formatted = this.convertSelectionToRangeString(currentSelection);

        // We treat this update as programmatic to force the input to match the clean format
        // But we need to be careful: if we set lastUpdateSource = 'programmatic', the effect might trigger again? 
        // No, the effect triggers on `selectedPagePids` change. Here we are just setting the input signal.
        // Actually, if we just set the input signal, valid.

        if (formatted !== this.pageRangeInput()) {
            this.pageRangeInput.set(formatted);
        }

        // Reset source to programmatic so subsequent external changes (like clicks) will continue to update input
        this.lastUpdateSource = 'programmatic';
    }

    /**
     * Apply page range selection based on input string
     */
    private applyPageRange(rangeString: string): void {
        if (!rangeString.trim()) {
            // Clear selection when input is empty
            this.selectedPagePids.set(new Set());
            return;
        }

        const selectedPids = new Set<string>();
        const parts = rangeString.split(',').map(p => p.trim()).filter(p => p);

        for (const part of parts) {
            if (part.includes('-')) {
                // Handle range (e.g., "3-7")
                const [startStr, endStr] = part.split('-').map(s => s.trim());
                if (!startStr || !endStr) continue; // Partial range like "3-"

                const start = parseInt(startStr, 10);
                const end = parseInt(endStr, 10);

                if (!isNaN(start) && !isNaN(end) && start <= end) {
                    for (let i = start; i <= end; i++) {
                        const pageIndex = i - 1; // Convert to 0-based index
                        if (pageIndex >= 0 && pageIndex < this.pages.length) {
                            if (this.maxSelectionCount === undefined || selectedPids.size < this.maxSelectionCount) {
                                selectedPids.add(this.pages[pageIndex].pid);
                            }
                        }
                    }
                }
            } else {
                // Handle single page number (e.g., "1", "5")
                const pageNum = parseInt(part, 10);
                if (!isNaN(pageNum)) {
                    const pageIndex = pageNum - 1; // Convert to 0-based index
                    if (pageIndex >= 0 && pageIndex < this.pages.length) {
                        if (this.maxSelectionCount === undefined || selectedPids.size < this.maxSelectionCount) {
                            selectedPids.add(this.pages[pageIndex].pid);
                        }
                    }
                }
            }
        }

        this.selectedPagePids.set(selectedPids);
    }

    /**
     * Convert selected PIDs back to a range string (e.g., "1-4,7-8,10")
     */
    private convertSelectionToRangeString(selectedPids: Set<string>): string {
        if (selectedPids.size === 0) {
            return '';
        }

        // Get page numbers (1-based) for selected PIDs
        const selectedPageNumbers: number[] = [];
        for (let i = 0; i < this.pages.length; i++) {
            if (selectedPids.has(this.pages[i].pid)) {
                selectedPageNumbers.push(i + 1); // Convert to 1-based
            }
        }

        // Sort page numbers
        selectedPageNumbers.sort((a, b) => a - b);

        if (selectedPageNumbers.length === 0) {
            return '';
        }

        // Group consecutive pages into ranges
        const ranges: string[] = [];
        let rangeStart = selectedPageNumbers[0];
        let rangeEnd = selectedPageNumbers[0];

        for (let i = 1; i < selectedPageNumbers.length; i++) {
            const currentPage = selectedPageNumbers[i];

            if (currentPage === rangeEnd + 1) {
                // Extend the current range
                rangeEnd = currentPage;
            } else {
                // Finish current range and start a new one
                if (rangeStart === rangeEnd) {
                    ranges.push(`${rangeStart}`);
                } else {
                    ranges.push(`${rangeStart}-${rangeEnd}`);
                }
                rangeStart = currentPage;
                rangeEnd = currentPage;
            }
        }

        // Add the last range
        if (rangeStart === rangeEnd) {
            ranges.push(`${rangeStart}`);
        } else {
            ranges.push(`${rangeStart}-${rangeEnd}`);
        }

        return ranges.join(',');
    }

    /**
     * Toggle selection of a single page or range (with Shift)
     */
    togglePageSelection(pid: string, event?: MouseEvent): void {
        this.lastUpdateSource = 'programmatic';
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
        this.lastUpdateSource = 'programmatic';
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
