import { Component, Input, Output, EventEmitter } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { NgForOf } from '@angular/common';
import { MatCheckbox } from '@angular/material/checkbox';

export interface CsvExportField {
  key: string;
  label: string;
  selected: boolean;
}

export interface CsvSectionData {
  selectedIds: string[];
  fields: CsvExportField[];
}

@Component({
  selector: 'app-export-csv-section',
  standalone: true,
  imports: [
    TranslatePipe,
    FormsModule,
    NgForOf,
    MatCheckbox
  ],
  templateUrl: './export-csv-section.component.html',
  styleUrl: './export-csv-section.component.scss'
})
export class ExportCsvSectionComponent {
  @Input() selectedIds: string[] = [];
  @Output() dataChange = new EventEmitter<CsvSectionData>();

  fields: CsvExportField[] = [
    { key: 'title', label: 'title', selected: false },
    { key: 'author', label: 'author', selected: false },
    { key: 'yearOfPublishing', label: 'year-of-publishing', selected: false },
    { key: 'printCount', label: 'print-count', selected: false },
    { key: 'keyword', label: 'keyword', selected: false },
    { key: 'geographicName', label: 'geographic-name', selected: false },
    { key: 'genre', label: 'genre', selected: false }
  ];

  ngOnInit() {
    this.emitData();
  }

  onFieldChange() {
    this.emitData();
  }

  getSelectedFieldsCount(): number {
    return this.fields.filter(field => field.selected).length;
  }

  private emitData() {
    this.dataChange.emit({
      selectedIds: this.selectedIds,
      fields: this.fields
    });
  }
}
