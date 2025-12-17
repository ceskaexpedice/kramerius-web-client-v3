import { Component, EventEmitter, Input, Output } from '@angular/core';
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

  @Output() submit = new EventEmitter<string>();
  @Output() optionChange = new EventEmitter<string>();

  selectedOption: string | null = null;

  onSubmit() {
    if (this.selectedOption) {
      this.submit.emit(this.selectedOption);
    }
  }

  onOptionChange(event: any) {
    this.optionChange.emit(event.value);
  }

}
