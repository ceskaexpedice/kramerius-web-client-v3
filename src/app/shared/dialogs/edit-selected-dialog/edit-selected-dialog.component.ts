import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { NgIf } from '@angular/common';
import {
  DialogConfig,
  SidebarDialogLayoutComponent,
} from '../sidebar-dialog-layout/sidebar-dialog-layout.component';

export interface EditSelectedDialogData {
  selectedIds: string[];
  selectedCount: number;
}

@Component({
  selector: 'app-edit-selected-dialog',
  imports: [
    TranslatePipe,
    NgIf,
    SidebarDialogLayoutComponent
  ],
  templateUrl: './edit-selected-dialog.component.html',
  styleUrl: './edit-selected-dialog.component.scss'
})
export class EditSelectedDialogComponent {

  dialogConfig: DialogConfig = {
    title: 'edit-selected',
    subtitle: '',
    showSaveButton: true,
    showCancelButton: false,
    saveButtonLabel: 'save',
    cancelButtonLabel: 'cancel',
    customButtons: [
      {
        label: 'go-to-admin-interface',
        action: 'admin',
        class: 'outlined tertiary',
      }
    ],
    sections: [
      { key: 'reindex', label: 'edit-section-reindex', icon: '' },
      { key: 'collections', label: 'edit-section-collections', icon: '' },
      { key: 'licence', label: 'edit-section-licence', icon: '' },
    ]
  };

  activeSection = signal<string>('reindex');

  private dialogRef = inject(MatDialogRef<EditSelectedDialogComponent>);
  public data = inject<EditSelectedDialogData>(MAT_DIALOG_DATA);

  constructor() {
    // Set the subtitle with selected count
    this.dialogConfig.subtitle = `Počet vybraných objektů: ${this.data.selectedCount}`;
  }

  save() {
    // TODO: Implement save logic based on activeSection and form data
    console.log('Save changes for section:', this.activeSection());
    this.dialogRef.close({ action: 'save', section: this.activeSection() });
  }

  close() {
    this.dialogRef.close();
  }

  onSectionChange(section: string) {
    this.activeSection.set(section);
  }

  onCustomButtonClick(action: string) {
    if (action === 'admin') {
      this.goToAdminInterface();
    }
  }

  goToAdminInterface() {
    // TODO: Implement navigation to admin interface with selected items
    console.log('Go to admin interface with items:', this.data.selectedIds);
    this.dialogRef.close({ action: 'admin', selectedIds: this.data.selectedIds });
  }
}
