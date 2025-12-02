import { Component, Input, Output, EventEmitter } from '@angular/core';
import {MatCheckbox} from '@angular/material/checkbox';
import {TranslatePipe} from '@ngx-translate/core';
import {NgClass, NgIf} from '@angular/common';
import {FormatNumberPipe} from '../../pipes/format-number.pipe';

@Component({
  selector: 'app-filter-item',
  imports: [
    MatCheckbox,
    TranslatePipe,
    NgIf,
    NgClass,
    FormatNumberPipe,
  ],
  templateUrl: './filter-item.component.html',
  styleUrl: './filter-item.component.scss'
})
export class FilterItemComponent {

  @Input() label!: string;
  @Input() truncateLabel: boolean = true;
  @Input() count!: number;
  @Input() checked = false;
  @Input() icon: string | null = null;
  @Input() disabled = false;
  @Output() toggled = new EventEmitter<void>();

  get isImageIcon(): boolean {
    return this.icon?.includes('/') || this.icon?.includes('.') || false;
  }

}
