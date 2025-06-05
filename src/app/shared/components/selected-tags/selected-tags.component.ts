import {Component, EventEmitter, Input, Output} from '@angular/core';
import {NgForOf, NgIf} from '@angular/common';
import {MatChip, MatChipsModule} from '@angular/material/chips';
import {MatButton} from '@angular/material/button';
import {TranslatePipe} from '@ngx-translate/core';
import {MatTooltip} from '@angular/material/tooltip';

@Component({
  selector: 'app-selected-tags',
  imports: [
    NgIf,
    MatChip,
    NgForOf,
    MatButton,
    MatChipsModule,
    TranslatePipe,
    MatTooltip,
  ],
  templateUrl: './selected-tags.component.html',
  styleUrl: './selected-tags.component.scss'
})
export class SelectedTagsComponent {
  @Input() items: string[] = [];
  @Input() clearButtonPosition: 'left' | 'right' = 'right';
  @Input() operators: Record<string, string> = {};
  @Input() showOperators: boolean = true;
  @Input() showFieldNames: boolean = true;
  @Input() translateItems: boolean = true;
  @Input() maxTagLength: number = 30;
  @Input() showClearAll = true;

  @Output() remove = new EventEmitter<string>();
  @Output() removeGroup = new EventEmitter<string>();
  @Output() clearAll = new EventEmitter<void>();

  get uniqueFields(): string[] {
    const fields = new Set<string>();
    this.items.forEach(item => {
      const field = this.getFieldName(item);
      fields.add(field);
    });
    return Array.from(fields);
  }

  getFieldName(filter: string): string {
    return filter.includes(':') ? filter.split(':')[0] : 'default';
  }

  getItemsForField(field: string): string[] {
    return this.items.filter(item => this.getFieldName(item) === field);
  }

  getOperatorForField(field: string): string | null {
    return this.operators[field] === 'AND' ? 'AND' : null;
  }

  getValue(item: string): string {
    const value = item.includes(':') ? item.split(':')[1] : item;

    if (value.length > this.maxTagLength) {
      return value.substring(0, this.maxTagLength - 3) + '...';
    }

    return value;
  }

  getOriginalValue(item: string): string {
    return item.includes(':') ? item.split(':')[1] : item;
  }
}
