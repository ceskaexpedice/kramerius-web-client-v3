import { Component, Input, Output, EventEmitter } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import {FormatNumberPipe} from '../../../../pipes/format-number.pipe';
import {MatRadioButton, MatRadioGroup} from '@angular/material/radio';
import {NgForOf, NgIf} from '@angular/common';

export interface ReindexSectionData {
  selectedIds: string[];
  scope: 'object' | 'object-and-children';
}

@Component({
  selector: 'app-edit-reindex-section',
  standalone: true,
  imports: [
    TranslatePipe,
    FormsModule,
    FormatNumberPipe,
    MatRadioButton,
    MatRadioGroup,
    NgForOf,
    NgIf,
  ],
  templateUrl: './edit-reindex-section.component.html',
  styleUrl: './edit-reindex-section.component.scss'
})
export class EditReindexSectionComponent {
  @Input() selectedIds: string[] = [];
  @Output() dataChange = new EventEmitter<ReindexSectionData>();

  selectedScope: 'object' | 'object-and-children' = 'object';

  onScopeChange() {
    this.dataChange.emit({
      selectedIds: this.selectedIds,
      scope: this.selectedScope
    });
  }
}
