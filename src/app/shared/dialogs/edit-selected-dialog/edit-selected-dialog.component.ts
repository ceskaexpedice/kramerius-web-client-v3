import { Component, computed, effect, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { NgIf } from '@angular/common';
import {
  DialogConfig,
  SidebarDialogLayoutComponent,
} from '../sidebar-dialog-layout/sidebar-dialog-layout.component';
import { EditReindexSectionComponent, ReindexSectionData } from './components/edit-reindex-section/edit-reindex-section.component';
import { EditCollectionsSectionComponent, CollectionsSectionData } from './components/edit-collections-section/edit-collections-section.component';
import { EditLicenceSectionComponent, LicenceSectionData } from './components/edit-licence-section/edit-licence-section.component';
import { AddCollectionSectionComponent } from './components/add-collection-section/add-collection-section.component';
import {
  RemoveCollectionSectionComponent
} from './components/remove-collection-section/remove-collection-section.component';
import { AddLicenseSectionComponent, AddLicenseSectionData } from './components/add-license-section/add-license-section.component';
import { RemoveLicenseSectionComponent, RemoveLicenseSectionData } from './components/remove-license-section/remove-license-section.component';
import { EditRepresentativePageSectionComponent, RepresentativePageSectionData } from './components/edit-representative-page-section/edit-representative-page-section.component';
import { DocumentTypeEnum } from '../../../modules/constants/document-type';
import {
  DocumentHierarchyItem,
  DocumentHierarchySelectorComponent,
} from '../../components/document-hierarchy-selector/document-hierarchy-selector.component';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AdminModeService } from '../../services';
import { Metadata } from '../../models/metadata.model';
import { CloseConfirmationDialogComponent } from './components/close-confirmation-dialog/close-confirmation-dialog.component';
import { ActionConfirmationDialogComponent, ActionConfirmationDialogData } from './components/action-confirmation-dialog/action-confirmation-dialog.component';
import { RecordHandlerService } from '../../services/record-handler.service';
import { ConfigService } from '../../../core/config/config.service';
import { DontShowAgainService, DontShowDialogs } from '../../services/dont-show-again.service';

export type EditSelectedDialogMode = 'bulk' | 'single';

export interface EditSelectedDialogData {
  selectedIds: string[];
  selectedCount: number;
  mode?: EditSelectedDialogMode;
  singleDocument?: Metadata;
}

export enum EditSelectedDialogSections {
  reindex = 'reindex',
  addCollection = 'add-collection',
  removeCollection = 'remove-collection',
  addLicence = 'add-licence',
  removeLicence = 'remove-licence',
  representativePage = 'representative-page',
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
    RemoveLicenseSectionComponent,
    EditRepresentativePageSectionComponent,
    TranslatePipe,
    DocumentHierarchySelectorComponent
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
      { key: EditSelectedDialogSections.representativePage, label: 'edit-section-representative-page', icon: 'icon-image', hidden: true },
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
  representativePageData: RepresentativePageSectionData | null = null;

  EditSelectedDialogSections = EditSelectedDialogSections;

  selectedHierarchyItem = signal<DocumentHierarchyItem | null>(null);
  showHierarchySelector = false;

  private dialogRef = inject(MatDialogRef<EditSelectedDialogComponent>);
  public data = inject<EditSelectedDialogData>(MAT_DIALOG_DATA);
  private adminModeService = inject(AdminModeService);
  private translateService = inject(TranslateService);
  private dialog = inject(MatDialog);
  private recordHandlerService = inject(RecordHandlerService);
  private configService = inject(ConfigService);
  private dontShowAgainService = inject(DontShowAgainService);

  selectedDocuments = computed(() => {
    if (this.data.mode === 'single' && this.data.singleDocument) {
      return [this.data.singleDocument];
    }
    return this.adminModeService.getSelectedItemsAsMetadata();
  });

  effectiveSelectedIds = computed(() => {
    const hierarchyItem = this.selectedHierarchyItem();
    if (!hierarchyItem) {
      return this.data.selectedIds;
    }

    const model = hierarchyItem.model;
    const ids = new Set<string>();

    this.selectedDocuments().forEach(doc => {
      const shareableTypes = this.recordHandlerService.getShareableDocumentTypes(doc);
      const matchingType = shareableTypes.find(t => t.model === model);
      if (matchingType && matchingType.pid) {
        ids.add(matchingType.pid);
      }
    });

    return Array.from(ids);
  });

  constructor() {
    effect(() => {
      const count = this.effectiveSelectedIds().length;
      this.dialogConfig.subtitle = `${this.translateService.instant('selected-objects--count')}: ${count}`;

      // Show admin button only when exactly 1 item is selected and adminClientUrl is configured
      const adminSection = this.dialogConfig.sections.find(s => s.key === EditSelectedDialogSections.admin);
      if (adminSection) {
        adminSection.hidden = count !== 1 || !this.configService.app.adminClientUrl;
      }

      // Representative-page section is only available via the bulk (checkbox) flow
      // and only when exactly one selected item is a page.
      const docs = this.selectedDocuments();
      const isBulkSinglePage = this.data.mode !== 'single'
        && docs.length === 1
        && docs[0]?.model === DocumentTypeEnum.page;
      const repSection = this.dialogConfig.sections.find(s => s.key === EditSelectedDialogSections.representativePage);
      if (repSection) {
        repSection.hidden = !isBulkSinglePage;
      }

      this.dialogConfig = { ...this.dialogConfig };
    });

    // Hierarchy selector is shown only in single-edit mode (pen button).
    // Bulk edit (checkbox selection) never shows it.
    this.showHierarchySelector = this.data.mode === 'single';

    if (this.data.mode === 'single') {
      this.dialogConfig.title = 'edit-single-object';
    }
  }

  isHierarchyPageSelected = computed<boolean>(() => {
    if (this.selectedHierarchyItem()?.model === DocumentTypeEnum.page) {
      return true;
    }
    if (!this.showHierarchySelector) {
      const docs = this.selectedDocuments();
      if (docs.length > 0 && docs.every(d => d?.model === DocumentTypeEnum.page)) {
        return true;
      }
    }
    return false;
  });

  singleSelectedPage = computed<Metadata | null>(() => {
    if (this.data.mode === 'single') {
      return null;
    }
    const docs = this.selectedDocuments();
    if (docs.length === 1 && docs[0]?.model === DocumentTypeEnum.page) {
      return docs[0];
    }
    return null;
  });

  onHierarchySelectionChanged(hierarchyItem: DocumentHierarchyItem) {
    this.selectedHierarchyItem.set(hierarchyItem);
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
    if (!this.dontShowAgainService.shouldShowDialog(DontShowDialogs.EditSelectedDialogCloseConfirmation)) {
      this.dialogRef.close();
      return;
    }

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
    const adminClientUrl = this.configService.app.adminClientUrl;
    if (!adminClientUrl) return;

    const selectedIds = this.effectiveSelectedIds();
    if (selectedIds.length !== 1) return;

    const uuid = selectedIds[0];
    const url = `${adminClientUrl}/object/${uuid}/actions`;
    window.open(url, '_blank');
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

  onRepresentativePageDataChange(data: RepresentativePageSectionData) {
    this.representativePageData = data;
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
      case EditSelectedDialogSections.representativePage:
        sectionData = this.representativePageData;
        confirmationTitle = 'representative-page-confirmation-dialog--header';
        confirmationMessage = 'representative-page-confirmation-dialog--message';
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
