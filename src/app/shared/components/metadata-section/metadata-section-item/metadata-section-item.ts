import { Component, Input, TemplateRef } from '@angular/core';
import { NgForOf, NgIf, NgTemplateOutlet } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { CollapsibleContent } from '../collapsible-content/collapsible-content';

export type MetadataItemType = 'text' | 'list' | 'clickable-list' | 'badge' | 'key-value';

@Component({
  selector: 'app-metadata-section-item',
  imports: [NgIf, NgForOf, NgTemplateOutlet, TranslatePipe, CollapsibleContent],
  templateUrl: './metadata-section-item.html',
  styleUrl: './metadata-section-item.scss'
})
export class MetadataSectionItem {

  @Input() label: string = '';
  @Input() type: MetadataItemType = 'text';
  @Input() value?: string;
  @Input() items?: any[];
  @Input() keyValuePairs?: { [key: string]: any };
  @Input() displayFn?: (item: any) => string;
  @Input() onItemClick?: (item: any) => void;
  @Input() showListBullets: boolean = false;
  @Input() icon?: string;
  @Input() listKeyUppercase: boolean = false;
  @Input() disableTranslate: boolean = false;
  @Input() collapsible: boolean = false;
  @Input() itemSuffixTpl?: TemplateRef<{ $implicit: any }>;
  @Input() maxItems?: number;
  @Input() headerActionLabel?: string;
  @Input() headerActionClick?: () => void;

  expanded = false;

  get visibleItems(): any[] {
    if (!this.items) return [];
    if (!this.maxItems || this.expanded) return this.items;
    return this.items.slice(0, this.maxItems);
  }

  get hiddenCount(): number {
    if (!this.items || !this.maxItems || this.expanded) return 0;
    return Math.max(0, this.items.length - this.maxItems);
  }

  handleHeaderAction(event: Event): void {
    event.stopPropagation();
    if (this.headerActionClick) {
      this.headerActionClick();
    }
  }

  getDisplayText(item: any): string {
    if (this.displayFn) {
      return this.displayFn(item);
    }
    return typeof item === 'string' ? item : String(item);
  }

  handleClick(item: any): void {
    if (this.onItemClick) {
      this.onItemClick(item);
    }
  }

  getKeys(): string[] {
    if (!this.keyValuePairs) {
      return [];
    }
    return Object.keys(this.keyValuePairs).filter(key => {
      const value = this.keyValuePairs![key];
      return value !== null && value !== undefined && value !== '' &&
        !(Array.isArray(value) && value.length === 0);
    });
  }

  getKeyValue(key: string): string {
    if (!this.keyValuePairs) {
      return '';
    }
    const value = this.keyValuePairs[key];
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return String(value);
  }

}
