import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import {LicensesListComponent} from '../../../../components/licenses-list/licenses-list.component';
import {Observable, forkJoin} from 'rxjs';
import {Store} from '@ngrx/store';
import {selectLicensesTotalCount} from '../../../../state/licenses/licenses.selectors';
import {AdminLicensesService} from '../../../../../core/admin/admin-licenses.service';

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
  styleUrls: ['./remove-license-section.component.scss', '../edit-selected-dialog-section.scss']
})
export class RemoveLicenseSectionComponent implements OnInit, OnChanges {
  @Input() selectedIds: string[] = [];
  @Output() dataChange = new EventEmitter<RemoveLicenseSectionData>();
  @Output() actionClick = new EventEmitter<void>();

  selectedLicenses: string[] = [];
  totalCount$: Observable<number>;

  private store = inject(Store);
  private adminLicensesService = inject(AdminLicensesService);

  constructor() {
    this.totalCount$ = this.store.select(selectLicensesTotalCount);
  }

  ngOnInit() {
    // Load existing licenses for selected items
    this.loadExistingLicenses();
  }

  ngOnChanges(changes: SimpleChanges) {
    // Reload licenses when selectedIds input changes
    if (changes['selectedIds'] && !changes['selectedIds'].firstChange) {
      this.loadExistingLicenses();
    }
  }

  /**
   * Load licenses for all selected items
   * If all items have the same licenses, preselect them for removal
   */
  private loadExistingLicenses() {
    if (!this.selectedIds || this.selectedIds.length === 0) {
      this.emitChange();
      return;
    }

    // If only one item selected, fetch its licenses
    if (this.selectedIds.length === 1) {
      this.adminLicensesService.getItemLicenses(this.selectedIds[0]).subscribe({
        next: (response) => {
          // Preselect all licenses from the single item
          this.selectedLicenses = response.licenses || [];
          console.log('Preselected licenses for single item:', this.selectedLicenses);
          this.emitChange();
        },
        error: (error) => {
          console.error('Error loading item licenses:', error);
          this.emitChange();
        }
      });
      return;
    }

    // Multiple items - fetch licenses for all
    const licenseRequests = this.selectedIds.map(id =>
      this.adminLicensesService.getItemLicenses(id)
    );

    forkJoin(licenseRequests).subscribe({
      next: (responses) => {
        // Check if all items have the same licenses
        const licenseSets = responses.map(r => new Set(r.licenses || []));
        const allEqual = this.areAllLicenseSetsEqual(licenseSets);

        if (allEqual && licenseSets.length > 0) {
          // All items have the same licenses - preselect them
          this.selectedLicenses = Array.from(licenseSets[0]);
          console.log('All items have the same licenses. Preselected:', this.selectedLicenses);
        } else {
          // Items have different licenses - find common licenses (intersection)
          const commonLicenses = this.findCommonLicenses(licenseSets);
          if (commonLicenses.length > 0) {
            this.selectedLicenses = commonLicenses;
            console.log('Items have different licenses. Preselected common ones:', this.selectedLicenses);
          } else {
            console.log('Items have no common licenses. No preselection.');
          }
        }

        this.emitChange();
      },
      error: (error) => {
        console.error('Error loading licenses for multiple items:', error);
        this.emitChange();
      }
    });
  }

  /**
   * Check if all license sets are equal
   */
  private areAllLicenseSetsEqual(licenseSets: Set<string>[]): boolean {
    if (licenseSets.length === 0) return true;

    const firstSet = licenseSets[0];
    return licenseSets.every(set =>
      set.size === firstSet.size &&
      Array.from(set).every(license => firstSet.has(license))
    );
  }

  /**
   * Find licenses that are common to all items (intersection)
   */
  private findCommonLicenses(licenseSets: Set<string>[]): string[] {
    if (licenseSets.length === 0) return [];

    const firstSet = licenseSets[0];
    const commonLicenses = Array.from(firstSet).filter(license =>
      licenseSets.every(set => set.has(license))
    );

    return commonLicenses;
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
