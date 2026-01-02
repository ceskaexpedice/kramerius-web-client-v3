import { Component, EventEmitter, inject, Output } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TabsComponent } from '../../components/tabs/tabs.component';
import { TabItemComponent } from '../../components/tabs/tab-item.component';
import { DocumentHierarchyItem, DocumentHierarchySelectorComponent } from '../../components/document-hierarchy-selector/document-hierarchy-selector.component';
import { Metadata } from '../../models/metadata.model';
import { NgIf } from '@angular/common';

@Component({
    selector: 'app-metadata-dialog',
    imports: [
        TranslatePipe,
        TabsComponent,
        TabItemComponent,
        DocumentHierarchySelectorComponent,
        NgIf
    ],
    templateUrl: './metadata-dialog.component.html',
    styleUrls: ['./metadata-dialog.component.scss', '../generic-dialog.scss']
})
export class MetadataDialogComponent {
    document!: Metadata;
    selectedPid: string = '';
    activeTabLabel: string = '';

    @Output() close = new EventEmitter<void>();

    private dialogRef = inject(MatDialogRef<MetadataDialogComponent>, { optional: true });
    data = inject<any>(MAT_DIALOG_DATA);

    constructor() {
        this.document = this.data.document;
    }

    onClose() {
        this.close.emit();
        this.dialogRef?.close();
    }

    onTabChanged(tabLabel: string): void {
        this.activeTabLabel = tabLabel;
    }

    onHierarchySelectionChanged(selectedItem: DocumentHierarchyItem): void {
        this.selectedPid = selectedItem.pid;
        // TODO: Load content based on selectedPid and activeTabLabel
    }
}
