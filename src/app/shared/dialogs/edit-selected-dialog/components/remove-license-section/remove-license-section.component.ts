import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import {LicensesListComponent} from '../../../../components/licenses-list/licenses-list.component';

export interface RemoveLicenseSectionData {
  selectedIds: string[];
  selectedLicenses: string[];
}

@Component({
  selector: 'app-remove-license-section',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    LicensesListComponent,
  ],
  templateUrl: './remove-license-section.component.html',
  styleUrl: './remove-license-section.component.scss'
})
export class RemoveLicenseSectionComponent {
  @Input() selectedIds: string[] = [];
  @Output() dataChange = new EventEmitter<RemoveLicenseSectionData>();

  selectedLicenses: string[] = [];

  onLicensesSelectionChange(selectedLicenses: string[]) {
    this.selectedLicenses = selectedLicenses;
    this.emitChange();
  }

  private emitChange() {
    this.dataChange.emit({
      selectedIds: this.selectedIds,
      selectedLicenses: [...this.selectedLicenses]
    });
  }
}