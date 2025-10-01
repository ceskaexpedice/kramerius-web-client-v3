import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import {LicensesListComponent} from '../../../../components/licenses-list/licenses-list.component';
import {Observable} from 'rxjs';
import {Store} from '@ngrx/store';
import {selectLicensesTotalCount} from '../../../../state/licenses/licenses.selectors';

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
  styleUrls: ['./add-license-section.component.scss', '../edit-selected-dialog-section.scss']
})
export class AddLicenseSectionComponent {
  @Input() selectedIds: string[] = [];
  @Output() dataChange = new EventEmitter<AddLicenseSectionData>();
  @Output() actionClick = new EventEmitter<void>();

  selectedLicenses: string[] = [];
  totalCount$: Observable<number>;

  constructor(
    private store: Store
  ) {
    this.totalCount$ = this.store.select(selectLicensesTotalCount);
  }

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

  onActionClick() {
    this.actionClick.emit();
  }
}
