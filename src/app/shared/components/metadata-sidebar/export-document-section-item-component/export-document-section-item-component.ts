import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MatRadioModule } from '@angular/material/radio';
import { FormsModule } from '@angular/forms';
import { NgFor } from '@angular/common';

export interface ExportOption {
  label: string;
  value: string;
  disabled: boolean;
}

@Component({
  selector: 'app-export-document-section-item-component',
  imports: [
    TranslatePipe,
    MatRadioModule,
    FormsModule,
    NgFor,

  ],
  templateUrl: './export-document-section-item-component.html',
  styleUrl: './export-document-section-item-component.scss',
})
export class ExportDocumentSectionItemComponent {

  @Input() title = '';
  @Input() icon = '';
  @Input() options: ExportOption[] = [];
  @Input() groupName = '';
  @Input() collapsible = false;
  @Input() set expanded(value: boolean) { this._expanded.set(value); }

  @Output() submit = new EventEmitter<string>();
  @Output() optionChange = new EventEmitter<string>();

  @Input() selectedOption: string | null = null;

  _expanded = signal(true);

  toggleExpanded(): void {
    this._expanded.update(v => !v);
  }

  onSubmit() {
    if (this.selectedOption) {
      this.submit.emit(this.selectedOption);
    }
  }

  onOptionChange(event: any) {
    this.optionChange.emit(event.value);
  }

}
