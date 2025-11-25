import { Component, computed, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { Page } from '../../models/page.model';
import { DetailPageItemComponent } from '../../../modules/detail-view-page/components/detail-page-item/detail-page-item.component';
import { CheckboxComponent } from '../../components/checkbox/checkbox.component';
import {MatSlideToggle} from '@angular/material/slide-toggle';
import {FormsModule} from '@angular/forms';

export interface PageSelectionDialogData {
    pages: Page[];
    title?: string;
}

export interface PageSelectionDialogResult {
    selectedPagePids: string[];
}

@Component({
    selector: 'app-page-selection-dialog',
  imports: [
    TranslatePipe,
    DetailPageItemComponent,
    CheckboxComponent,
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

    // Track selected page PIDs using a signal
    selectedPagePids = signal<Set<string>>(new Set());

    // Computed signal for selected count
    selectedCount = computed(() => this.selectedPagePids().size);

    // Computed signal to check if all pages are selected
    allSelected = computed(() => {
        return this.selectedPagePids().size === this.pages.length && this.pages.length > 0;
    });

    constructor() {
        this.pages = this.data.pages || [];
        if (this.data.title) {
            this.dialogTitle = this.data.title;
        }
    }

    /**
     * Toggle selection of a single page
     */
    togglePageSelection(pid: string): void {
        const currentSelection = new Set(this.selectedPagePids());

        if (currentSelection.has(pid)) {
            currentSelection.delete(pid);
        } else {
            currentSelection.add(pid);
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
            // Deselect all
            this.selectedPagePids.set(new Set());
        } else {
            // Select all
            const allPids = new Set(this.pages.map(page => page.pid));
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
