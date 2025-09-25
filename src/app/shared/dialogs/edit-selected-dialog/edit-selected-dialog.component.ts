import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NgIf } from '@angular/common';
import {
  DialogConfig,
  SidebarDialogLayoutComponent,
} from '../sidebar-dialog-layout/sidebar-dialog-layout.component';
import { EditReindexSectionComponent, ReindexSectionData } from './components/edit-reindex-section/edit-reindex-section.component';
import { EditCollectionsSectionComponent, CollectionsSectionData } from './components/edit-collections-section/edit-collections-section.component';
import { EditLicenceSectionComponent, LicenceSectionData } from './components/edit-licence-section/edit-licence-section.component';

export interface EditSelectedDialogData {
  selectedIds: string[];
  selectedCount: number;
}

@Component({
  selector: 'app-edit-selected-dialog',
  imports: [
    NgIf,
    SidebarDialogLayoutComponent,
    EditReindexSectionComponent,
    EditCollectionsSectionComponent,
    EditLicenceSectionComponent
  ],
  templateUrl: './edit-selected-dialog.component.html',
  styleUrl: './edit-selected-dialog.component.scss'
})
export class EditSelectedDialogComponent {

  dialogConfig: DialogConfig = {
    title: 'edit-selected',
    subtitle: '',
    showSaveButton: false,
    showCancelButton: false,
    saveButtonLabel: 'save',
    cancelButtonLabel: 'cancel',
    customButtons: [

    ],
    sections: [
      { key: 'reindex', label: 'edit-section-reindex', icon: 'icon-refresh' },
      {
        key: 'collections',
        label: 'edit-section-collections',
        icon: '',
        isTitle: true,
        children: [
          { key: 'add-collection', label: 'add-collection--label', icon: 'icon-add-circle' },
          { key: 'remove-collection', label: 'remove-collection--label', icon: 'icon-minus-cirlce' }
        ]
      },
      {
        key: 'licence',
        label: 'edit-section-licence',
        icon: '',
        isTitle: true,
        children: [
          { key: 'add-licence', label: 'add-licence--label', icon: 'icon-add-circle' },
          { key: 'remove-licence', label: 'remove-licence--label', icon: 'icon-minus-cirlce' }
        ]
      },
      { key: 'title-cover', label: 'edit-section-titlecover', icon: '' },
      { key: 'admin', label: 'go-to-admin-interface', icon: 'icon-export-2', isAction: true },
    ]
  };

  activeSection = signal<string>('reindex');

  // Data from section components
  reindexData: ReindexSectionData | null = null;
  collectionsData: CollectionsSectionData | null = null;
  licenceData: LicenceSectionData | null = null;

  private dialogRef = inject(MatDialogRef<EditSelectedDialogComponent>);
  public data = inject<EditSelectedDialogData>(MAT_DIALOG_DATA);

  constructor() {
    // Set the subtitle with selected count
    this.dialogConfig.subtitle = `Počet vybraných objektů: ${this.data.selectedCount}`;
  }

  save() {
    const currentSection = this.activeSection();
    let sectionData = null;

    switch (currentSection) {
      case 'reindex':
        sectionData = this.reindexData;
        break;
      case 'collections':
        sectionData = this.collectionsData;
        break;
      case 'licence':
        sectionData = this.licenceData;
        break;
    }

    console.log('Save changes for section:', currentSection, sectionData);
    this.dialogRef.close({
      action: 'save',
      section: currentSection,
      data: sectionData
    });
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

  onActionClick(action: string) {
    if (action === 'admin') {
      this.goToAdminInterface();
    }
  }

  goToAdminInterface() {
    // TODO: Implement navigation to admin interface with selected items
    console.log('Go to admin interface with items:', this.data.selectedIds);
    this.dialogRef.close({ action: 'admin', selectedIds: this.data.selectedIds });
  }

  onReindexDataChange(data: ReindexSectionData) {
    this.reindexData = data;
  }

  onCollectionsDataChange(data: CollectionsSectionData) {
    this.collectionsData = data;
  }

  onLicenceDataChange(data: LicenceSectionData) {
    this.licenceData = data;
  }
}
