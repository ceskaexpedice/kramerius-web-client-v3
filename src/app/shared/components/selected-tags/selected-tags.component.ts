import {Component, EventEmitter, Input, Output} from '@angular/core';
import {NgForOf, NgIf} from '@angular/common';
import {MatChip, MatChipsModule} from '@angular/material/chips';
import {MatButton} from '@angular/material/button';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-selected-tags',
  imports: [
    NgIf,
    MatChip,
    NgForOf,
    MatButton,
    MatChipsModule,
    TranslatePipe,
  ],
  templateUrl: './selected-tags.component.html',
  styleUrl: './selected-tags.component.scss'
})
export class SelectedTagsComponent {
  @Input() items: string[] = [];
  @Input() clearButtonPosition: 'left' | 'right' = 'right';
  @Input() operators: Record<string, string> = {};

  @Output() remove = new EventEmitter<string>();
  @Output() removeOperator = new EventEmitter<string>(); // Renamed event
  @Output() clearAll = new EventEmitter<void>();

  // Get all unique fields from the items
  get uniqueFields(): string[] {
    const fields = new Set<string>();
    this.items.forEach(item => {
      const field = this.getFieldName(item);
      fields.add(field);
    });
    return Array.from(fields);
  }

  // Helper method to get field name from a filter string
  getFieldName(filter: string): string {
    return filter.split(':')[0];
  }

  // Get filter items for a specific field
  getItemsForField(field: string): string[] {
    return this.items.filter(item => this.getFieldName(item) === field);
  }

  // Get operator for a field
  getOperatorForField(field: string): string | null {
    // Only return AND operator, ignore OR (default)
    return this.operators[field] === 'AND' ? 'AND' : null;
  }

}
