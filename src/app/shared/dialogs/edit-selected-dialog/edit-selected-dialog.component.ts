import {Component, computed, inject, signal} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { NgIf } from '@angular/common';
import {
  DialogConfig,
  SidebarDialogLayoutComponent,
} from '../sidebar-dialog-layout/sidebar-dialog-layout.component';
import { EditReindexSectionComponent, ReindexSectionData } from './components/edit-reindex-section/edit-reindex-section.component';
import { EditCollectionsSectionComponent, CollectionsSectionData } from './components/edit-collections-section/edit-collections-section.component';
import { EditLicenceSectionComponent, LicenceSectionData } from './components/edit-licence-section/edit-licence-section.component';
import {AddCollectionSectionComponent} from './components/add-collection-section/add-collection-section.component';
import {
  RemoveCollectionSectionComponent
} from './components/remove-collection-section/remove-collection-section.component';
import {AddLicenseSectionComponent, AddLicenseSectionData} from './components/add-license-section/add-license-section.component';
import {RemoveLicenseSectionComponent, RemoveLicenseSectionData} from './components/remove-license-section/remove-license-section.component';
import {
  DocumentHierarchyItem,
  DocumentHierarchySelectorComponent,
} from '../../components/document-hierarchy-selector/document-hierarchy-selector.component';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {SelectionService} from '../../services';
import {CloseConfirmationDialogComponent} from './components/close-confirmation-dialog/close-confirmation-dialog.component';
import {ActionConfirmationDialogComponent, ActionConfirmationDialogData} from './components/action-confirmation-dialog/action-confirmation-dialog.component';

export interface EditSelectedDialogData {
  selectedIds: string[];
  selectedCount: number;
}

export enum EditSelectedDialogSections {
  reindex = 'reindex',
  addCollection = 'add-collection',
  removeCollection = 'remove-collection',
  addLicence = 'add-licence',
  removeLicence = 'remove-licence',
  titleCover = 'title-cover',
  admin = 'admin'
}

@Component({
  selector: 'app-edit-selected-dialog',
  imports: [
    NgIf,
    SidebarDialogLayoutComponent,
    EditReindexSectionComponent,
    EditLicenceSectionComponent,
    AddCollectionSectionComponent,
    RemoveCollectionSectionComponent,
    AddLicenseSectionComponent,
    RemoveLicenseSectionComponent
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
      { key: EditSelectedDialogSections.reindex, label: 'edit-section-reindex', icon: 'icon-refresh' },
      {
        key: 'collections',
        label: 'edit-section-collections',
        icon: '',
        isTitle: true,
        children: [
          { key: EditSelectedDialogSections.addCollection, label: 'add-collection--label', icon: 'icon-add-circle' },
          { key: EditSelectedDialogSections.removeCollection, label: 'remove-collection--label', icon: 'icon-minus-cirlce' }
        ]
      },
      {
        key: 'licence',
        label: 'edit-section-licence',
        icon: '',
        isTitle: true,
        children: [
          { key: EditSelectedDialogSections.addLicence, label: 'add-licence--label', icon: 'icon-add-circle' },
          { key: EditSelectedDialogSections.removeLicence, label: 'remove-licence--label', icon: 'icon-minus-cirlce' }
        ]
      },
      // { key: EditSelectedDialogSections.titleCover, label: 'edit-section-titlecover', icon: '' },
      { key: EditSelectedDialogSections.admin, label: 'go-to-admin-interface', icon: 'icon-export-2', isAction: true },
    ]
  };

  activeSection = signal<string>('reindex');

  // Data from section components
  reindexData: ReindexSectionData | null = null;
  collectionsData: CollectionsSectionData | null = null;
  licenceData: LicenceSectionData | null = null;
  addLicenseData: AddLicenseSectionData | null = null;
  removeLicenseData: RemoveLicenseSectionData | null = null;

  EditSelectedDialogSections = EditSelectedDialogSections;

  selectedHierarchyItem: DocumentHierarchyItem | null = null;
  showHierarchySelector = false;

  private dialogRef = inject(MatDialogRef<EditSelectedDialogComponent>);
  public data = inject<EditSelectedDialogData>(MAT_DIALOG_DATA);
  private selectionService = inject(SelectionService);
  private translateService = inject(TranslateService);
  private dialog = inject(MatDialog);

  selectedDocuments = computed(() => {
    return this.selectionService.getSelectedItemsAsMetadata();
  });

  constructor() {
    // Set the subtitle with selected count
    this.dialogConfig.subtitle = `${this.translateService.instant('selected-objects--count')}: ${this.data.selectedCount}`;

    // we show the hierarchy selector only if all items have same rootUuid
    const rootUuids = new Set(this.selectedDocuments().map(doc => doc.rootPid));
    this.showHierarchySelector = rootUuids.size === 1;
  }

  // Get selected documents as Metadata array for hierarchy selector

  onHierarchySelectionChanged(hierarchyItem: DocumentHierarchyItem) {
    this.selectedHierarchyItem = hierarchyItem;
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
      case EditSelectedDialogSections.addLicence:
        sectionData = this.addLicenseData;
        break;
      case EditSelectedDialogSections.removeLicence:
        sectionData = this.removeLicenseData;
        break;
    }

    this.openActionConfirmationDialog({
      title: 'save-confirmation-dialog--header',
      message: 'save-confirmation-dialog--message',
      confirmButtonLabel: 'yes-execute--button',
      cancelButtonLabel: 'cancel'
    }, () => {
      console.log('Save changes for section:', currentSection, sectionData);
      this.dialogRef.close({
        action: 'yes-execute--button',
        section: currentSection,
        data: sectionData
      });
    });
  }

  close() {
    const confirmationDialogRef = this.dialog.open(CloseConfirmationDialogComponent, {
      width: '50vw',
      autoFocus: true,
      restoreFocus: false,
      hasBackdrop: true,
      disableClose: false
    });

    confirmationDialogRef.afterClosed().subscribe(confirmed => {
      console.log('confirmed', confirmed);
      if (confirmed) {
        this.dialogRef.close();
      }
    });
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
    this.openActionConfirmationDialog({
      title: 'admin-confirmation-dialog--header',
      message: 'admin-confirmation-dialog--message',
      confirmButtonLabel: 'proceed',
      cancelButtonLabel: 'cancel'
    }, () => {
      // TODO: Implement navigation to admin interface with selected items
      console.log('Go to admin interface with items:', this.data.selectedIds);
      this.dialogRef.close({ action: 'admin', selectedIds: this.data.selectedIds });
    });
  }

  openActionConfirmationDialog(data: ActionConfirmationDialogData, onConfirm: () => void) {
    const confirmationDialogRef = this.dialog.open(ActionConfirmationDialogComponent, {
      width: '50vw',
      data,
      autoFocus: true,
      restoreFocus: false,
      hasBackdrop: true,
      disableClose: false
    });

    confirmationDialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        onConfirm();
      }
    });
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

  onAddLicenseDataChange(data: AddLicenseSectionData) {
    this.addLicenseData = data;
  }

  onRemoveLicenseDataChange(data: RemoveLicenseSectionData) {
    this.removeLicenseData = data;
  }

  onSectionActionClick() {
    const currentSection = this.activeSection();
    let sectionData = null;
    let confirmationTitle = 'action-confirmation-dialog--header';
    let confirmationMessage = 'action-confirmation-dialog--message';

    switch (currentSection) {
      case EditSelectedDialogSections.reindex:
        sectionData = this.reindexData;
        confirmationTitle = 'reindex-confirmation-dialog--header';
        confirmationMessage = 'reindex-confirmation-dialog--message';
        break;
      case EditSelectedDialogSections.addCollection:
        sectionData = this.collectionsData;
        confirmationTitle = 'add-collection-confirmation-dialog--header';
        confirmationMessage = 'add-collection-confirmation-dialog--message';
        break;
      case EditSelectedDialogSections.removeCollection:
        sectionData = this.collectionsData;
        confirmationTitle = 'remove-collection-confirmation-dialog--header';
        confirmationMessage = 'remove-collection-confirmation-dialog--message';
        break;
      case EditSelectedDialogSections.addLicence:
        sectionData = this.addLicenseData;
        confirmationTitle = 'add-license-confirmation-dialog--header';
        confirmationMessage = 'add-license-confirmation-dialog--message';
        break;
      case EditSelectedDialogSections.removeLicence:
        sectionData = this.removeLicenseData;
        confirmationTitle = 'remove-license-confirmation-dialog--header';
        confirmationMessage = 'remove-license-confirmation-dialog--message';
        break;
    }

    // Validate that we have data to process
    if (!sectionData) {
      console.warn('No data available for section:', currentSection);
      return;
    }

    this.openActionConfirmationDialog({
      title: confirmationTitle,
      message: confirmationMessage,
      confirmButtonLabel: 'yes-execute--button',
      cancelButtonLabel: 'cancel'
    }, () => {
      console.log('Execute action for section:', currentSection, sectionData);
      // Close dialog and return the action data
      this.dialogRef.close({
        section: currentSection,
        data: sectionData
      });
    });
  }
}
