import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import {MatRadioButton, MatRadioGroup} from '@angular/material/radio';
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
    MatRadioButton,
    MatRadioGroup,
  ],
  templateUrl: './edit-reindex-section.component.html',
  styleUrls: ['./edit-reindex-section.component.scss', '../edit-selected-dialog-section.scss']
})
export class EditReindexSectionComponent implements OnInit, OnChanges {
  @Input() selectedIds: string[] = [];
  @Input() hideChildrenScope = false;
  @Output() dataChange = new EventEmitter<ReindexSectionData>();
  @Output() actionClick = new EventEmitter<void>();

  selectedScope: 'object' | 'object-and-children' = 'object';

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedIds']) {
      this.emitData();
    }
    if (changes['hideChildrenScope'] && this.hideChildrenScope && this.selectedScope === 'object-and-children') {
      this.selectedScope = 'object';
      this.emitData();
    }
  }

  ngOnInit() {
    this.emitData();
  }

  onScopeChange() {
    this.emitData();
  }

  private emitData() {
    this.dataChange.emit({
      selectedIds: this.selectedIds,
      scope: this.selectedScope
    });
  }

  onActionClick() {
    this.actionClick.emit();
  }
}
