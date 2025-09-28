import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import {LicensesListComponent} from '../../../../components/licenses-list/licenses-list.component';

export interface AddLicenseSectionData {
  selectedIds: string[];
  selectedLicenses: string[];
}

@Component({
  selector: 'app-add-license-section',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    LicensesListComponent,
  ],
  templateUrl: './add-license-section.component.html',
  styleUrl: './add-license-section.component.scss'
})
export class AddLicenseSectionComponent {
  @Input() selectedIds: string[] = [];
  @Output() dataChange = new EventEmitter<AddLicenseSectionData>();

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