import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {TranslateService} from '@ngx-translate/core';
import { NgIf } from '@angular/common';
import {
  DialogConfig,
  SidebarDialogLayoutComponent,
} from '../sidebar-dialog-layout/sidebar-dialog-layout.component';
import { ExportCsvSectionComponent, CsvSectionData } from './components/export-csv-section/export-csv-section.component';

export interface ExportSelectedDialogData {
  selectedIds: string[];
  selectedCount: number;
}

@Component({
  selector: 'app-export-selected-dialog',
  imports: [
    NgIf,
    SidebarDialogLayoutComponent,
    ExportCsvSectionComponent
  ],
  templateUrl: './export-selected-dialog.component.html',
  styleUrl: './export-selected-dialog.component.scss'
})
export class ExportSelectedDialogComponent {

  csvSectionData: CsvSectionData | null = null;

  dialogConfig: DialogConfig = {
    title: 'export-selected',
    subtitle: '',
    showSaveButton: false,
    showCancelButton: false,
    cancelButtonLabel: 'cancel',
    customButtons: [
      {
        label: 'export',
        action: 'export',
        class: 'primary',
        disabled: () => !this.data || this.data.selectedCount === 0
      }
    ],
    sections: [
      { key: 'csv', label: 'export-section-csv', icon: ''},
      // { key: 'xml', label: 'export-section-xml', icon: 'icon-code' },
      // { key: 'dl4dh', label: 'export-section-dl4dh', icon: 'icon-data' },
    ]
  };

  activeSection = signal<string>('csv');

  private dialogRef = inject(MatDialogRef<ExportSelectedDialogComponent>);
  public data = inject<ExportSelectedDialogData>(MAT_DIALOG_DATA);
  private translateService = inject(TranslateService);

  constructor() {
    // Set the subtitle with selected count
    this.dialogConfig.subtitle = `${this.translateService.instant('selected-objects-count')}: ${this.data.selectedCount}`;
  }

  close() {
    this.dialogRef.close();
  }

  onSectionChange(section: string) {
    this.activeSection.set(section);
  }

  onCustomButtonClick(action: string) {
    if (action === 'export') {
      this.export();
    }
  }

  onCsvSectionChange(data: CsvSectionData) {
    this.csvSectionData = data;
  }

  export() {
    console.log('Export data:', this.csvSectionData);
    this.dialogRef.close({
      action: 'export',
      format: this.activeSection(),
      options: this.csvSectionData,
      selectedIds: this.data.selectedIds
    });
  }
}
