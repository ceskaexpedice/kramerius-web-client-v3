import { Component, Input, TemplateRef } from '@angular/core';
import { NgForOf, NgIf, NgTemplateOutlet } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { CollapsibleContent } from '../collapsible-content/collapsible-content';
import { NamespacedTranslatePipe } from '../../../pipes/namespaced-translate.pipe';

export type MetadataItemType = 'text' | 'list' | 'clickable-list' | 'badge' | 'key-value';

@Component({
  selector: 'app-metadata-section-item',
  imports: [NgIf, NgForOf, NgTemplateOutlet, TranslatePipe, NamespacedTranslatePipe, CollapsibleContent],
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
  /**
   * When set, each clickable item (clickable-list / badge) renders as a real
   * `<a href>` so it can be opened in a new tab. A plain left-click is still
   * handled in-app via `onItemClick`; modifier/middle clicks follow the href.
   */
  @Input() itemHref?: (item: any) => string | null | undefined;
  @Input() showListBullets: boolean = false;
  @Input() icon?: string;
  @Input() listKeyUppercase: boolean = false;
  @Input() disableTranslate: boolean = false;
  /**
   * When set, list/clickable-list items are translated within this namespace
   * (e.g. 'language' -> key 'language-{code}'), falling back to the raw value
   * when no translation exists. Avoids collisions with the global namespace.
   */
  @Input() translateNamespace?: string;
  @Input() collapsible: boolean = false;
  @Input() itemSuffixTpl?: TemplateRef<{ $implicit: any }>;
  /** Optional custom renderer for each item of a `type="list"` list. */
  @Input() itemTpl?: TemplateRef<{ $implicit: any }>;
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

  getItemHref(item: any): string | null {
    return this.itemHref?.(item) ?? null;
  }

  /**
   * Keyboard/click on the <li>. When the item has an href it's rendered as an
   * inner <a> that owns navigation, so the <li> handler is a no-op; otherwise
   * the <li> is the interactive element and fires the in-app handler.
   */
  handleItemClick(item: any): void {
    if (this.getItemHref(item)) return;
    this.handleClick(item);
  }

  handleItemSpace(event: Event, item: any): void {
    if (this.getItemHref(item)) return;
    event.preventDefault();
    this.handleClick(item);
  }

  /**
   * Left-click on an item link: run the in-app handler and suppress the default
   * navigation. Modifier / middle clicks fall through so the browser opens the
   * href in a new tab as usual.
   */
  handleLinkClick(event: MouseEvent, item: any): void {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    this.handleClick(item);
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
