import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface LicenceSectionData {
  selectedIds: string[];
  selectedLicences?: string[];
  action?: 'add' | 'remove' | 'replace';
  applyToAll?: boolean;
}

@Component({
  selector: 'app-edit-licence-section',
  standalone: true,
  imports: [
    FormsModule
  ],
  templateUrl: './edit-licence-section.component.html',
  styleUrl: './edit-licence-section.component.scss'
})
export class EditLicenceSectionComponent {
  @Input() selectedIds: string[] = [];
  @Output() dataChange = new EventEmitter<LicenceSectionData>();

  selectedLicences: string[] = [];
  selectedAction: 'add' | 'remove' | 'replace' = 'replace';
  applyToAll: boolean = false;

  private emitChange() {
    this.dataChange.emit({
      selectedIds: this.selectedIds,
      selectedLicences: [...this.selectedLicences],
      action: this.selectedAction,
      applyToAll: this.applyToAll
    });
  }
}
